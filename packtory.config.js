// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const packageRoots = {
    main: {
        js: 'all-rules.js',
        declarationFile: 'all-rules.d.ts'
    }
};

const packageInterface = {
    modules: [ { root: 'main', export: '.' } ]
};

/**
 * @param {NodeJS.ProcessEnv} environmentVariables
 * @returns {import('@packtory/cli').PacktoryConfig['registrySettings']}
 */
export function resolveRegistrySettingsForEnvironment(environmentVariables) {
    const npmToken = environmentVariables.NPM_TOKEN;

    if (npmToken !== undefined && npmToken !== '') {
        return {
            auth: {
                type: 'bearer-token',
                token: npmToken
            }
        };
    }

    if (environmentVariables.GITHUB_ACTIONS === 'true') {
        return {
            auth: {
                type: 'npm-oidc',
                provider: 'github-actions'
            }
        };
    }

    return undefined;
}

/**
 * @param {NodeJS.ProcessEnv} environmentVariables
 * @returns {NonNullable<NonNullable<import('@packtory/cli').PacktoryConfig['commonPackageSettings']>['publishSettings']>}
 */
export function resolvePublishSettingsForEnvironment(environmentVariables) {
    return {
        access: 'public',
        ...environmentVariables.GITHUB_ACTIONS === 'true' ? { provenance: { type: 'auto' } } : {}
    };
}

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfig>}
 */
export async function buildConfig() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);
    // eslint-disable-next-line node/no-process-env -- Packtory config maps publish auth and provenance from process env.
    const environmentVariables = process.env;
    const registrySettings = resolveRegistrySettingsForEnvironment(environmentVariables);
    const publishSettings = resolvePublishSettingsForEnvironment(environmentVariables);

    return {
        ...registrySettings === undefined ? {} : { registrySettings },
        changelog: {
            packageTagFormat: '{packageName}@{version}',
            outputs: [ { kind: 'repository-file', path: 'CHANGELOG.md' }, { kind: 'github-release' } ]
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageJson: packageJson,
            includeSourceMapFiles: true,
            publishSettings,
            additionalPackageJsonAttributes: {
                author: packageJson.author,
                description: packageJson.description,
                keywords: packageJson.keywords,
                license: packageJson.license,
                repository: packageJson.repository,
                engines: packageJson.engines
            },
            additionalFiles: [
                {
                    sourceFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                },
                {
                    sourceFilePath: path.join(projectFolder, 'README.md'),
                    targetFilePath: 'README.md'
                }
            ]
        },
        packages: [
            {
                name: packageJson.name,
                versioning: { automatic: true, minimumVersion: packageJson.version },
                roots: packageRoots,
                packageInterface
            }
        ]
    };
}
