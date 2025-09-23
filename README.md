# irish-rail-ui

Irish train location viewer

# Updating data

```bash
# update data
git submodule update --remote data

# extract events and stations csv files
node main.ts

# Generate the database
rm ui/src/assets/data.duckdb
duckdb ui/src/assets/data.duckdb -c ".read import.sql"
```

