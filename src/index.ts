import axios, { AxiosError, AxiosResponse, isAxiosError } from "axios";
import { createHmac } from "crypto";
import qs from "querystring";
import { AuthPayload, TokenSettings, User } from "./types/user";
import { mkdir, writeFile } from "fs";

let cookies: string;
const userCredentials: AuthPayload = {
  nonce: "",
  username: "demo@example.org",
  password: "test",
};

const getLoginNonce = async (): Promise<string> => {
  try {
    const response = await axios.get("https://challenge.sunvoy.com/login");
    const nonce = response.data.match(/name="nonce"\s+value="(.+?)"/)?.[1];
    if (!nonce) {
      throw new Error("no login nonce found in login form");
    }
    return String(nonce);
  } catch (error) {
    console.error(error);
    return String(error);
  }
};

const authUserRequest = async () => {
  try {
    const nonce = await getLoginNonce();
    userCredentials.nonce = nonce;

    const response = await axios.post("https://challenge.sunvoy.com/login", qs.stringify(userCredentials), {
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = response.headers["set-cookie"];
    if (setCookie) {
      cookies = String(setCookie);
    }
  } catch (error) {
    console.error(error);
  }
};

const getTokenSettings = async (): Promise<TokenSettings | AxiosError> => {
  try {
    const response: AxiosResponse = await axios.get("https://challenge.sunvoy.com/settings/tokens", {
      headers: { Cookie: cookies },
    });
    const tokens: string = response.data;
    const accessToken = tokens.match(/id="access_token"\s+value="(.+?)"/)?.[1];
    const openId = tokens.match(/id="openId"\s+value="(.+?)"/)?.[1];
    const userId = tokens.match(/id="userId"\s+value="(.+?)"/)?.[1];
    const apiUser = tokens.match(/id="apiuser"\s+value="(.+?)"/)?.[1];
    const operateId = tokens.match(/id="operateId"\s+value="(.+?)"/)?.[1];
    const language = tokens.match(/id="language"\s+value="(.+?)"/)?.[1];
    const timestamp = Math.floor(Date.now() / 1000).toString();

    const tempTokenSettings: TokenSettings = {
      access_token: accessToken || "",
      openId: openId || "",
      userId: userId || "",
      apiuser: apiUser || "",
      operateId: operateId || "",
      language: language || "",
      timestamp: timestamp,
    };

    const sortedQuery = Object.keys(tempTokenSettings)
      .sort()
      .map((key) => {
        const k = key as keyof TokenSettings;
        return `${key}=${encodeURIComponent(String(tempTokenSettings[k]))}`;
      })
      .join("&");

    const checkcode = createHmac("sha1", "mys3cr3t").update(sortedQuery).digest("hex").toUpperCase();

    const tokenSettings: TokenSettings = {
      ...tempTokenSettings,
      checkcode: checkcode,
    };

    return tokenSettings;
  } catch (error) {
    const err = error as AxiosError;
    console.error(error);
    return err;
  }
};

const getUsersList = async (): Promise<User[] | AxiosError> => {
  let users: User[] = [];
  try {
    const response = await axios.post<User[]>(
      "https://challenge.sunvoy.com/api/users",
      {},
      { headers: { Cookie: cookies } }
    );

    users = response.data;

    const tokenSettings = await getTokenSettings();
    if (!tokenSettings || isAxiosError(tokenSettings)) throw new Error("no token settings available");

    const currentUser = await axios.post<User>(
      "https://api.challenge.sunvoy.com/api/settings",
      qs.stringify(tokenSettings),
      { headers: { Cookie: cookies } }
    );
    users.push(currentUser.data);
    return users;
  } catch (error) {
    const err = error as AxiosError;
    console.error(error);
    return err;
  }
};

const main = async () => {
  await authUserRequest();
  const sessionId = cookies.match(/JSESSIONID=([^;]+)/)?.[1];

  if (sessionId) {
    const users = await getUsersList();
    if (!isAxiosError(users) && users.length) {
      mkdir("./src/result", { recursive: true }, (err) => {
        if (err) {
          throw err;
        } else {
          writeFile("./src/result/users.json", JSON.stringify(users, null, 2), (err) => {
            if (err) {
              console.error(err);
            } else {
              console.log("stored in ./src/results/users.json file");
            }
          });
        }
      });
    } else {
      console.error("failed to fetch users:", users);
    }
  }
};

main();
