#!/bin/bash


EXE=xjtutennis

rm -rf build
mkdir -p build/{server,client}

# build server
if [[ ! -z $OS ]]; then
    export GOOS=$OS
else
    export GOOS=$(go env GOOS)
fi
if [[ ! -z $ARCH ]]; then
    export GOARCH=$ARCH
else
    export GOARCH=$(go env GOARCH)
fi

if [[ -z $VERSION ]]; then
    echo -n "Building development version on target "
else
    echo -n "Building version $VERSION on target "
fi
echo "$GOOS-$GOARCH:"

VAR_VERSION="github.com/endaytrer/xjtutennis/constant.Version"
if [[ ! -z $VERSION ]]; then
    go build -ldflags "-X ${VAR_VERSION}=${VERSION}" -o $EXE
else
    go build -o $EXE
fi

if [[ $? != 0 ]]; then
    echo Fatal: server build failed
    exit 1
fi
echo "Server build done."

cp -a LICENSE README.md build
cp -a create_table.sql init.sh clear_reservations.sh build/server
mv $EXE build/server/

# build client
if ! make -C client; then
    echo Fatal: client build failed
    exit 1
fi

cp -a client/build/client build/

if [[ ! -z $VERSION ]]; then
    RELEASE_NAME="xjtutennis-${VERSION}-${GOOS}-${GOARCH}"
else
    RELEASE_NAME="xjtutennis-git_$(git rev-parse --short HEAD)-${GOOS}-${GOARCH}"
fi

echo "Creating tarball..."
tar -czf $RELEASE_NAME.tar.gz build/*
echo "Done."