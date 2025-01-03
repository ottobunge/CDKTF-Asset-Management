import { Construct } from "constructs";
import { App } from "cdktf";
import { BaseStack } from "./lib/BaseStack";
import { BaseStackProps, DependecyAttributes, Dependencies } from "./lib/BaseStack/types";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";
import { DependencyStack } from "./lib/DependencyStack";


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
const backendBucket = process.env.BACKEND_BUCKET;
const install_dependencies = process.env.INSTALL_DEPENDENCIES;
if(!region || !accountId || !backendBucket){
    console.log("Please set ENV Variables AWS_ACCOUNT, AWS_REGION, BACKEND_BUCKET and ORGANIZATION");
    process.exit(1);
}

if(install_dependencies === "true"){
  const dependencies: {
    [key: string]: DependecyAttributes;
  } = {
    "someAssetId": {
      [Dependencies.DATABASE]: {
        "url": "https://example.com",
        "username": "admin",
        "password": "password"
      },
      [Dependencies.SENTRY]: {
        "dsn": "https://example.com",
      }
    }
  }
  new DependencyStack(app, "DependencyStack", {
      accountId,
      region,
      environment: "example-env",
      backendBucket,
      dependencies,
  });
} else {
  new MyStack(app, "AssetManagement", {
    accountId,
    region,
    environment: "example-env",
    backendBucket,
  });
}
app.synth();
