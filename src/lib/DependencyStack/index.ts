import { Construct } from "constructs";
import { BaseStack } from "../BaseStack";
import { DependencyStackProps } from "./types";
import { DependecyAttributes } from "../BaseStack/types";
import { SecretsmanagerSecret } from "@cdktf/provider-aws/lib/secretsmanager-secret";
import { SecretsmanagerSecretVersion } from "@cdktf/provider-aws/lib/secretsmanager-secret-version";
import { TerraformOutput, Fn } from "cdktf";

/**
 * DependencyStack manages infrastructure dependencies through AWS Secrets Manager.
 * It creates and stores dependencies as secrets that can be accessed by other stacks.
 * We have to be careful not to use functions from the BaseStack that call getDependencySecretName(), getDependency(), or getSetting()
 * because this stack is not loaded yet.
 */
export class DependencyStack extends BaseStack {
    /**
     * Creates a new instance of DependencyStack
     * @param {Construct} scope - The scope in which to define this construct
     * @param {string} id - The scoped construct ID
     * @param {DependencyStackProps} props - Configuration properties including dependencies to be stored
     */
    constructor(scope: Construct, id: string, props: DependencyStackProps) {
        super(scope, id, props);
        this.createAssets(props.settings.dependencySecretNamePrefix, props.dependencies);
        new TerraformOutput(this, "SettingsOutput", {
            value: Fn.jsonencode(props.settings),
        });
    }

    /**
     * Creates AWS Secrets Manager resources to store dependencies
     * @param {Record<string, Partial<DependecyAttributes>>} dependencies - Key-value pairs of dependencies to be stored in Secrets Manager
     * @private
     */
    private createAssets(prefix: string, dependencies: {
        [key: string]: Partial<DependecyAttributes>;
    }){
        const dependencySecretName = `${prefix}/${this.environment}`;
        const secretManager = new SecretsmanagerSecret(this, dependencySecretName, {
            name: dependencySecretName,
        });
        new SecretsmanagerSecretVersion(this, `${dependencySecretName}-version`, {
            secretId: secretManager.id,
            secretString: JSON.stringify(dependencies),
        });
        new TerraformOutput(this, "DependencySecretNameOutput", {
            value: Fn.jsonencode({
                secret: secretManager.id,
                environment: this.environment,
            }),
        });
    }
};
