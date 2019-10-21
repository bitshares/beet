cd $TRAVIS_BUILD_DIR
export PACKAGE_VERSION=$(node -p "require('./package.json').version")
git config --global user.email "travis@travis-ci.org"
git config --global user.name "Travis CI"
if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []Release[]\ ].*$ ]]; then
    export $SHOULD_BUILD = true
    export $TRAVIS_TAG="v${PACKAGE_VERSION}"
    echo "Beet Installer ${TRAVIS_TAG}" > release_name
    echo "This is the official Beet v${PACKAGE_VERSION} release." > release_desc
fi
if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []RC[]\ ].*$ ]]; then
    export $SHOULD_BUILD = true
    export $TRAVIS_TAG="v${PACKAGE_VERSION}"
    echo "v${PACKAGE_VERSION}-rc-${TRAVIS_COMMIT}" > release_name
    echo "This is a Release Candidate Beet build. Contains new features but may also contain bugs." > release_desc
fi
if [[ "$TRAVIS_COMMIT_MESSAGE" =~ ^[\ []Test[]\ ].*$ ]]; then
    export $SHOULD_BUILD = true
    export $TRAVIS_TAG="v${PACKAGE_VERSION}"
    echo "v${PACKAGE_VERSION}-rc-${TRAVIS_COMMIT}" > release_name
    echo "This is a test development Beet build. Not for production use." > release_desc
fi
if [ "$SHOULD_BUILD" = true ] then
    git remote rm origin
    git remote add origin https://github.com:${GH_TOKEN}@github.com/bitshares/beet.git > /dev/null 2>&1
    git tag $TRAVIS_TAG
    git push origin $TRAVIS_TAG
fi