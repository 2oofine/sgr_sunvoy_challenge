type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type AuthPayload = {
  username: string;
  password: string;
  nonce: string;
};

type TokenSettings = {
  access_token: string;
  apiuser: string;
  language: string;
  openId: string;
  operateId: string;
  timestamp: string;
  userId: string;
  checkcode?: string;
};

export { User, AuthPayload, TokenSettings };
