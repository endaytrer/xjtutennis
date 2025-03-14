#!/bin/bash

if [ $# -ne 1 ]; then
    echo "Usage: $0 version"
    exit 1
fi

BRANCH=$(git branch --show-current)

# Can only publish on alpha or stable channel
if [[ $BRANCH != "alpha" ]] && [[ $BRANCH != "stable" ]]; then
    echo "Fatal: not on alpha or stable channel"
    exit 1
fi

if [[ ! -z $(git status --porcelain) ]]; then
    echo "Fatal: git repo is dirty"
    exit 2
fi

VERSION=$1
# Check if version matches regex
if [[ $BRANCH -eq "alpha" ]]; then
    if [[ ! $VERSION =~ ^v([0-9]|[1-9][0-9]+)\.([0-9]|[1-9][0-9]+)\.([0-9]|[1-9][0-9]+)\-alpha\.[1-9][0-9]*$ ]]; then
        echo "Fatal: version format does not match alpha release"
        exit 3
    fi
else
    if [[ ! $VERSION =~ ^v([0-9]|[1-9][0-9]+)\.([0-9]|[1-9][0-9]+)\.([0-9]|[1-9][0-9]+)$ ]]; then
        echo "Fatal: version format does not match stable release"
        exit 3
    fi
fi

VAR_VERSION="github.com/endaytrer/xjtutennis/constant.Version"
BUILD_COMMAND="go build -ldflags \"-X ${VAR_VERSION}=${VERSION}\" -o xjtutennis"

if ! eval $BUILD_COMMAND; then
    echo "Fatal: build failed"
    exit 4
fi

if ! $(git tag $VERSION); then
    exit 5
fi

git push origin $VERSION


