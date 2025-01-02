import { Construct } from "constructs";
import { App } from "cdktf";
import { BaseStack } from "./lib/BaseStack";
import { BaseStackProps, Dependencies } from "./lib/BaseStack/types";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";


class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
      const database = this.getAsset("someAssetId", Dependencies.DATABASE);
            const secret = new SecretsmanagerSecret(this, "someSecret", {
        name: "MySecretExample",
      });
      const url = database('url');
      const user = database('username');
      const password = database('password');
      new SecretsmanagerSecretVersion(this, "someSecretVersion", {
        secretId: secret.id,
        secretString: `URL: ${url}, USER: ${user}, PASSWORD: ${password}`,
      });
  }
}

const app = new App();
const accountId = process.env.AWS_ACCOUNT_ID;
const region = process.env.AWS_REGION;

if(!region || !accountId){
  console.log("Please set ENV Variables AWS_ACCOUNT and AWS_REGION");
  process.exit(1);
}

new MyStack(app, "AssetManagement", {
  accountId,
  region,
  environment: "example-env",
});

app.synth();
