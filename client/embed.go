// Package webassets embeds the built React SPA so the whole panel ships as a
// single self-contained binary.
package webassets

import (
	"embed"

	"github.com/gin-contrib/static"
)

//go:embed all:build/client
var distFS embed.FS

// FS returns the SPA filesystem rooted at the dist directory (index.html at top
// level).
func FS() static.ServeFileSystem {
	sub, err := static.EmbedFolder(distFS, "build/client")
	if err != nil {
		panic(err)
	}
	return sub
}
