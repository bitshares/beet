cd $TRAVIS_BUILD_DIR
unamestr=`uname`
echo TRAVIS_BRANCH=$TRAVIS_BRANCH
## Set a branch variable so we can detect the current branch in webpack if we're in staging or develop branch
if [ $unamestr = 'Linux' ] && [ $TRAVIS_BRANCH = 'staging' ]
then
    export BRANCH=$TRAVIS_BRANCH
fi
if [ $unamestr = 'Linux' ] && [ $TRAVIS_BRANCH = 'develop' ] && [ -z $TRAVIS_PULL_REQUEST_BRANCH ]
then
    export BRANCH=$TRAVIS_BRANCH
fi

## Test packaging
npm run make