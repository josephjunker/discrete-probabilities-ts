#! /bin/sh

# https://www.embedthis.com/blog/sensedeep/how-to-create-single-source-npm-module.html

cat >dist/cjs/package.json <<!EOF
{
    "type": "commonjs"
}
!EOF

cat >dist/mjs/package.json <<!EOF
{
    "type": "module"
}
!EOF