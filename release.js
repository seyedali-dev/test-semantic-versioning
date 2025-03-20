const {execSync} = require('child_process');
const semanticRelease = require('semantic-release');

/**
 * Returns true if the current commit is a beta release.
 * A beta release is identified by having "[beta]" in the commit message.
 * @returns {boolean} True if the current commit is a beta release.
 */
function isBetaRelease() {
    const commits = execSync('git log --pretty=format:%s -n 1').toString().trim();
    return commits.includes('[beta]');
}

/**
 * Runs a release with the given configuration.
 * The configuration is based on the 'develop' branch.
 * If the current commit is a beta release, it will be added to the configuration.
 *
 * @returns {Promise<void>} Resolves when the release is finished.
 */
async function runRelease() {
    const beta = isBetaRelease();
    const config = {
        branches: ['develop'],
        plugins: [
            ['@semantic-release/commit-analyzer', {
                preset: 'conventionalcommits',
                releaseRules: [
                    {type: 'feat', release: 'minor'},
                    {type: 'fix', release: 'patch'},
                    {type: 'perf', release: 'patch'},
                    {breaking: true, release: 'major'},
                ],
            }],
            '@semantic-release/release-notes-generator',
            ['@semantic-release/npm', {
                pkgRoot: 'frontend',
                npmPublish: false,
            }],
            ['@semantic-release/exec', {
                prepareCmd: `mvn versions:set -DnewVersion=\${nextRelease.version} -f backend/freetoolsy-server/pom.xml`,
            }],
            '@semantic-release/github',
            ['@semantic-release/git', {
                assets: ['frontend/package.json', 'backend/freetoolsy-server/pom.xml'],
            }],
        ],
        tagFormat: 'v${version}',
    };

    if (beta) {
        config.prerelease = 'BETA';
    }

    await semanticRelease(config);
}

runRelease().catch(console.error);