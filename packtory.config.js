// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

const projectFolder = process.cwd();
const sourcesFolder = path.join(projectFolder, 'target/build/source');

const packageRoots = {
    main: {
        javaScript: 'all-rules.js',
        declarationFile: 'all-rules.d.ts'
    }
};

const packageInterface = {
    modules: [ { root: 'main', export: '.' } ]
};

/**
 * @param {NodeJS.ProcessEnv} environmentVariables
 * @returns {import('@packtory/cli').PacktoryConfiguration['registrySettings']}
 */
export function resolveRegistrySettingsForEnvironment(environmentVariables) {
    const npmToken = environmentVariables.NPM_TOKEN;

    if (npmToken !== undefined && npmToken !== '') {
        return {
            authentication: {
                type: 'bearer-token',
                token: npmToken
            }
        };
    }

    if (environmentVariables.GITHUB_ACTIONS === 'true') {
        return {
            authentication: {
                type: 'npm-open-identity-connect',
                provider: 'github-actions'
            }
        };
    }

    return undefined;
}

/**
@returns {NonNullable<import('@packtory/cli').PacktoryConfiguration['changelog']>}
*/
function createChangelogSettings() {
    return {
        packageTagFormat: '{packageName}@{version}',
        pullRequestLog: {
            ignoredLabels: [ 'release' ],
            collapseRules: [
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update dependency (?<dependency>.+?) from (?<from>.+?) to (?<to>.+?)$',
                    replace: '$<prefix>Update dependency $<dependency> from $<from> to $<to>'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?Update (?:dependency )?`?(?<dependency>.+?)`? to `?(?<to>[^` ]+)`?$',
                    replace: '$<prefix>Update dependency $<dependency> to $<to>',
                    versionGroup: 'to'
                },
                {
                    label: 'upgrade',
                    pattern: '^(?<prefix>⬆️ )?(?<dependency>Lock file maintenance|Update (?:.+ dependencies|eslint))$',
                    replace: '$<prefix>$<dependency>',
                    collapse: 'same'
                }
            ]
        },
        outputs: [ { kind: 'repository-file', path: 'CHANGELOG.md' }, { kind: 'github-release' } ]
    };
}

/**
 * @param {NodeJS.ProcessEnv} environmentVariables
 * @returns {NonNullable<NonNullable<import('@packtory/cli').PacktoryConfiguration['commonPackageSettings']>['publishSettings']>}
 */
export function resolvePublishSettingsForEnvironment(environmentVariables) {
    return {
        access: 'public',
        ...environmentVariables.GITHUB_ACTIONS === 'true' ? { provenance: { type: 'automatic' } } : {}
    };
}

/**
 * @returns {Promise<import('@packtory/cli').PacktoryConfiguration>}
 */
export async function buildConfiguration() {
    const packageJsonContent = await fs.readFile(path.join(projectFolder, 'package.json'), { encoding: 'utf8' });
    const packageJson = JSON.parse(packageJsonContent);
    // eslint-disable-next-line node/no-process-env -- Packtory config maps publish auth and provenance from process env.
    const environmentVariables = process.env;
    const registrySettings = resolveRegistrySettingsForEnvironment(environmentVariables);
    const publishSettings = resolvePublishSettingsForEnvironment(environmentVariables);

    return {
        ...registrySettings === undefined ? {} : { registrySettings },
        changelog: createChangelogSettings(),
        releasePullRequest: {
            branch: 'release/eslint-plugin-node-assert',
            body: 'Updates CHANGELOG.md for the next @enormora/eslint-plugin-node-assert release.',
            githubActionsContinuousIntegration: {
                trigger: 'workflow-dispatch',
                workflowFile: 'main.yml',
                requiredStatusContexts: [
                    'Test (22.x)',
                    'Test (24.x)',
                    'Test (26.x)',
                    'Release PR policy',
                    'Workflow Security Analysis'
                ]
            },
            label: 'release',
            title: 'Prepare release'
        },
        commonPackageSettings: {
            sourcesFolder,
            mainPackageManifest: packageJson,
            includeSourceMapFiles: true,
            publishSettings,
            additionalPackageManifestAttributes: {
                author: packageJson.author,
                description: packageJson.description,
                keywords: packageJson.keywords,
                license: packageJson.license,
                repository: packageJson.repository,
                engines: packageJson.engines
            },
            additionalFiles: [
                {
                    inputFilePath: path.join(projectFolder, 'LICENSE'),
                    targetFilePath: 'LICENSE'
                },
                {
                    inputFilePath: path.join(projectFolder, 'README.md'),
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
        ],
        checks: {
            noDevelopmentDependencyImports: { enabled: true },
            noUnusedBundleDependencies: { enabled: true },
            uniqueTargetPaths: { enabled: true },
            noUnexposedExecutables: { enabled: true },
            nodeEngineCompatibility: { enabled: true },
            noDuplicatedFiles: { enabled: true },
            requiredFiles: { enabled: true, files: [ 'LICENSE', 'README.md' ] },
            typeScriptIntegrity: { enabled: true, declarations: 'all' }
        }
    };
}
