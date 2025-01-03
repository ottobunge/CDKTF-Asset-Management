import { Construct } from "constructs";
import { TerraformStack, Fn, S3Backend } from "cdktf";
import { AwsProvider } from "@cdktf/provider-aws/lib/provider";
import { DataAwsSecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/data-aws-secretsmanager-secret-version";
import type { DependecyAttributes, BaseStackProps } from "./types";

/**
 * BaseStack is an abstract class that provides core functionality for AWS infrastructure stacks.
 * It handles AWS provider setup, S3 backend configuration, and dependency management through AWS Secrets Manager.
 */
export abstract class BaseStack extends TerraformStack {
  /** AWS account ID where the stack will be deployed */
  public readonly accountId: string;
  /** Name identifier for the stack */
  public readonly name: string;
  /** AWS region where resources will be deployed */
  public readonly region: string;
  /** S3 bucket name used for storing Terraform state */
  public readonly backendBucket: string;
  /** AWS Provider instance for this stack */
  public readonly provider: AwsProvider;
  /** Environment name (e.g., 'dev', 'prod') */
  public readonly environment: string;
  /** Loaded dependencies from AWS Secrets Manager */
  private readonly loadedDependencies: DataAwsSecretsmanagerSecretVersion;

  /**
   * Creates a new instance of BaseStack
   * @param scope - The scope in which to define this construct
   * @param id - The scoped construct ID
   * @param props - Configuration properties for the stack
   */
  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id);
    this.name = id;
    this.accountId = props.accountId;
    this.region = props.region;
    this.environment = props.environment;
    this.backendBucket = props.backendBucket;
    new S3Backend(this, {
      bucket: this.backendBucket,
      key: `terraform/state/${this.environment}/${this.name}/terraform.tfstate`,
      region: this.region,
      encrypt: true,
      dynamodbTable: "terraform-state-lock",
    });

    this.provider = new AwsProvider(this, `provider-${this.region}`, {
      region: this.region,
    });

    this.loadedDependencies = new DataAwsSecretsmanagerSecretVersion(this, `dependencies-${this.environment}`, {
      secretId: this.getDependencySecretName(),
    });

  }

  /**
   * Gets the AWS Secrets Manager secret name for dependencies
   * @returns The secret name formatted as 'asset-management/{environment}'
   */
  public getDependencySecretName() {
    return `asset-management/${this.environment}`;
  }

  /**
   * Retrieves a specific dependency attribute from AWS Secrets Manager
   * @param assetId - The identifier of the asset
   * @param dependencyType - The type of dependency to retrieve
   * @returns A function that accepts an attribute name and returns its value from the secret
   */
  public getDependency<Dep extends keyof DependecyAttributes>(assetId: string, dependencyType: Dep) {
    const secretString = this.loadedDependencies.secretString;
    /**
     * Lookup the attribute in the secret string
     * @param attribute - The attribute to lookup
     * @returns a terraform reference to the attribute.
     */
    const accessor = <Attr extends keyof DependecyAttributes[Dep]>(attribute: Attr): DependecyAttributes[Dep][Attr] => Fn.lookupNested(Fn.jsondecode(secretString), [assetId, dependencyType, attribute]);
    return accessor;
  }

}
