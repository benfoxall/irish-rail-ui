# irish-rail-ui

Irish train location viewer

# Updating data

```bash
# update data
git submodule update --remote data

# extract content from git
./generate.sh

# generate a duckdb file
duckdb data.ddb -c ".read generate.sql"
```

