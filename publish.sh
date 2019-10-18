cd $TRAVIS_BUILD_DIR

## publish the binaries on tag
if [ $TRAVIS_TAG ]
then
    npm run release
fi

ls -la dist
