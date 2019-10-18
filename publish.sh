cd $TRAVIS_BUILD_DIR

ls -la

## publish the binaries on tag
if [ $TRAVIS_TAG ]
then
    npm run release
fi
