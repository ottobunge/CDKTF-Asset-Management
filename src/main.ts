import { Construct } from "constructs";
import { App, Fn, TerraformOutput } from "cdktf";
import { BaseStack } from "./lib/BaseStack";
import { BaseStackProps, Dependencies } from "./lib/BaseStack/types";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";
import { DependencyStack } from "./lib/DependencyStack";


class MyStack extends BaseStack {
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
      const database = this.getDependency("someAssetId", Dependencies.DATABASE);
      const sentry = this.getDependency("someAssetId", Dependencies.SENTRY);
      const example = this.getDependency("someAssetId", Dependencies.EXAMPLE);
      const secret = new SecretsmanagerSecret(this, "someSecret", {
        name: "MySecretExample",
      });
      const url = database('url');
      const user = database('username');
      const password = database('password');
      const dsn = sentry('dsn');
      const str = example('str');
      const num = example('num');
      const bool = example('bool');
      new SecretsmanagerSecretVersion(this, "someSecretVersion", {
        secretId: secret.id,
        secretString: `URL: ${url}, USER: ${user}, PASSWORD: ${password}, DSN: ${dsn}, STR: ${str}, NUM: ${num}, BOOL: ${bool}`,
      });
      new TerraformOutput(this, "FromSettings", {
        value: Fn.jsonencode({
          loadedSubnetIds: this.getSetting("subnetIds"),
          loadedVpcId: this.getSetting("vpcId"),
        }),
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
  const dependencies = {
    "someAssetId": {
      [Dependencies.DATABASE]: {
        "url": "https://example.com",
        "username": "admin",
        "password": "password"
      },
      [Dependencies.SENTRY]: {
        "dsn": "https://example.com",
      },
      [Dependencies.EXAMPLE]: {
        "str": "example",
        "num": 1,
        "bool": true,
      }
    }
  }
  new DependencyStack(app, "DependencyStack", {
      accountId,
      region,
      environment: "example-env",
      backendBucket,
      dependencies,
      dependencyStackName: '',
      settings: {
        subnetIds: ["123123","321321"],
        vpcId: 'vpc-123123',
      }
  });
} else {
  new MyStack(app, "AssetManagement", {
    accountId,
    region,
    environment: "example-env",
    backendBucket,
    dependencyStackName: 'DependencyStack',
  });
}
app.synth();
