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
if [[ $BRANCH == "alpha" ]]; then
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

export VERSION
build_targets=(
    "linux amd64"
    "linux arm64"
    "linux mips64"
    "linux mips64le"
    "linux riscv64"
    "linux ppc64"
    "linux ppc64le"
    "linux s390x"
    "freebsd amd64"
    "freebsd arm64"
    "darwin arm64"
    "darwin amd64"
    "windows amd64"
    "windows arm64"
)
for build_target in "${build_targets[@]}"; do

    arr=($build_target)
    export OS=${arr[0]}
    export ARCH=${arr[1]}
    
    if ! ./build.sh; then
        echo "Fatal: build target $OS-$ARCH failed"
        exit 4
    fi
done

rm -rf dist
mkdir dist
mv *.tar.gz dist

if ! $(git tag $VERSION); then
    exit 5
fi

git push origin $VERSION


