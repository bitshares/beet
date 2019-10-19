cd $TRAVIS_BUILD_DIR
export PACKAGE_VERSION=$(node -p "require('./package.json').version")
git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"

if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []Release[]\ ].*$ ]]; then
    export TRAVIS_TAG="v${PACKAGE_VERSION}"
    export RELEASE_NAME="Beet Installer ${TRAVIS_TAG}"
    export RELEASE_DESC="This is the official Beet v${PACKAGE_VERSION} release."
fi
if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []RC[]\ ].*$ ]]; then
    export TRAVIS_TAG="v${PACKAGE_VERSION}-rc-${TRAVIS_COMMIT}"
    export RELEASE_NAME="Beet Installer ${TRAVIS_TAG}"
    export RELEASE_DESC="This is a Release Candidate Beet build. Contains new features but may also contain bugs."
fi
if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []Test[]\ ].*$ ]]; then
    export TRAVIS_TAG="v${PACKAGE_VERSION}-devbuild-${TRAVIS_COMMIT}"
    export RELEASE_NAME="Beet Installer ${TRAVIS_TAG}"
    export RELEASE_DESC="This is a test development Beet build. Not for production use."
fi
ls
set
git remote rm origin
git remote add origin https://github.com:${GH_TOKEN}@github.com/bitshares/beet.git > /dev/null 2>&1
git tag $TRAVIS_TAG
git push origin --tags