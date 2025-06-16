import qs from "querystring";
import axios from "axios";
import { AuthPayload, User } from "./types/user";

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

const main = async () => {
  await authUserRequest();
  const sessionId = cookies.match(/JSESSIONID=([^;]+)/)?.[1];

  if (sessionId) {
    //TODO: get users list if authenticated and append current user also
  }
};

main();
