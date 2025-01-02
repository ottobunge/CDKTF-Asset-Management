import { Construct } from "constructs";
import { TerraformStack, Fn, S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsSecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/data-aws-secretsmanager-secret-version";
import type { DependecyAttributes, BaseStackProps } from "./types";

export abstract class BaseStack extends TerraformStack {
  public readonly accountId: string;
  public readonly region: string;
  public readonly provider: AwsProvider;
  public readonly environment: string;  
  private readonly loadedDependencies: DataAwsSecretsmanagerSecretVersion;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);

    this.accountId = props.accountId;
    this.region = props.region;
    this.environment = props.environment;

    new S3Backend(this, {
      bucket: "ottomundo-terraform-state",
      key: `terraform/state/${this.environment}/terraform.tfstate`,
      region: this.region,
      encrypt: true,
      dynamodbTable: "ottomundo-terraform-state-lock",      
    });

    this.provider = new AwsProvider(this, `provider-${this.region}`, {
      region: this.region,
    });

    this.loadedDependencies = new DataAwsSecretsmanagerSecretVersion(this, `dependencies-${this.environment}`, {
      secretId: this.getDependencySecretName(),
    });

  }

  private getDependencySecretName() {
    return `asset-management/${this.environment}`;
  }

  public getAsset<Dep extends keyof DependecyAttributes>(assetId: string, dependencyType: Dep) {
    const secretString = this.loadedDependencies.secretString;
    return (attribute: keyof DependecyAttributes[Dep]) => Fn.lookupNested(Fn.jsondecode(secretString), [assetId, dependencyType, attribute]);
  }
  
}
