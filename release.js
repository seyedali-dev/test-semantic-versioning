const { execSync } = require('child_process');
const semanticRelease = require('semantic-release');

function isBetaRelease() {
    const latestCommit = execSync('git log --pretty=format:%s -n 1').toString().trim();
    return latestCommit.includes('[beta]');
}

async function runRelease() {
    const beta = isBetaRelease();
    const config = {
        branches: ['develop'],
        plugins: [
            ['@semantic-release/commit-analyzer', {
                preset: 'conventionalcommits',
                releaseRules: [
                    { type: 'feat', release: 'minor' },
                    { type: 'fix', release: 'patch' },
                    { type: 'perf', release: 'patch' },
                    { breaking: true, release: 'major' }
                ]
            }],
            '@semantic-release/release-notes-generator',
            ['@semantic-release/npm', {
                pkgRoot: 'frontend',
                npmPublish: false
            }],
            ['@semantic-release/exec', {
                prepareCmd: 'mvn versions:set -DnewVersion=${nextRelease.version} -f backend/freetoolsy-server/pom.xml'
            }],
            '@semantic-release/github',
            ['@semantic-release/git', {
                assets: ['frontend/package.json', 'backend/freetoolsy-server/pom.xml']
            }]
        ],
        tagFormat: 'v${version}'
    };

    if (beta) {
        config.prepare = config.prepare || [];
        config.prepare.push({
            path: '@semantic-release/exec',
            cmd: 'echo "BETA release detected"; echo "${nextRelease.version}-BETA" > .next-version'
        });
        config.success = config.success || [];
        config.success.push({
            path: '@semantic-release/exec',
            cmd: 'git tag -f v${nextRelease.version}-BETA && git push --force --tags'
        });
    }

    const result = await semanticRelease(config);
    if (!result) {
        console.log('No release published.');
    }
}

runRelease().catch(err => {
    console.error(err);
    process.exit(1);
});