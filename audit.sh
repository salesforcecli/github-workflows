#! /bin/bash

FOO="barEEE more text"
# replace EEE with 'baz'
FOO=${FOO/EEE/; ls -lah;}
echo "$FOO"