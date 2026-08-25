import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  ListUsersCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION,
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;

export async function adminDeleteCognitoUser(username: string) {
  await client.send(
    new AdminDeleteUserCommand({ UserPoolId: USER_POOL_ID, Username: username })
  );
}

export async function adminCreateCognitoUser(
  email: string,
  password: string,
  attrs: Record<string, string>
) {
  await client.send(
    new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: Object.entries(attrs).map(([Name, Value]) => ({ Name, Value })),
      MessageAction: "SUPPRESS",
    })
  );
  await client.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );
}

export async function findCognitoSubByEmail(email: string) {
  const res = await client.send(
    new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${email}"`,
    })
  );
  return res.Users?.[0]?.Attributes?.find((a) => a.Name === "sub")?.Value;
}