# dwn-datastore-gcs

This module will leverage Google Cloud Storage for the DWN datastore.  This enables fast and scalable storage for larger files that are saved through DWN.  

## Create Cloud Storage Bucket

Follow [these instructions](https://cloud.google.com/storage/docs/creating-buckets) to create a Cloud Storage Bucket in GCP.  The service account that is running the DWN server must have access to cloud storage (IAM role: Storage Object User)

## Code changes

1. If there are updates that need to happen, create a branch first and switch to it

`git checkout -b {branch-name}`

Example [(branch naming conventions)](https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534)

`git checkout -b upgrade/dwn-datastore-gcs-0.1.1`

2. Check that library versions are up to date.  Update package.json for versions of libraries. 

   * Confirm [@tbd54566975/dwn-sql-store](https://github.com/TBD54566975/dwn-sql-store/blob/main/package.json) version is up to date
   * Confirm [@tbd54566975/dwn-sdk-js](https://github.com/TBD54566975/dwn-sdk-js/blob/main/package.json) version is up to date.  This directly affects this library and more likely to change
   * Confirm [@google-cloud/storage](https://github.com/googleapis/nodejs-storage) is up to date
   * Other libraries won't change as often, but good to compare every so often to confirm library versions are matching.

3. Update other source files as needed
4. Run tests

* Run `pnpm install`  to update libraries
* If not already created, or if it needs to be reloaded, create the postgres database with the following settings.  This needs to be done at the command line since the GCP console does not have all of these options in the UI.  You can run this command in the Cloud SQL Studio window.

CREATE DATABASE dwn_data_store_dev
  WITH ENCODING='UTF8'
       TEMPLATE=template0
       OWNER=cloudsqlsuperuser
       LC_COLLATE='C'
       LC_CTYPE='C'
       CONNECTION LIMIT=-1;

* Set env variables
* Open cloud-sql-proxy for local db connection
* configure gcloud auth

To run tests at the command line: 
```
pnpm install
gcloud auth login --update-adc
gcloud config set project {project-id}
gcloud auth application-default set-quota-project {project-id}
# In a new terminal window, start the cloud-sql-proxy, which will create a proxy from the command line window to the Cloud SQL database.  Installation instructions for cloud-sql-proxy (https://cloud.google.com/sql/docs/postgres/sql-proxy)[here].
./cloud-sql-proxy --address 0.0.0.0 --port 1234 {db-connection-string}

export DWN_GCS_BUCKET_NAME={gcs-bucket-name}
export DWN_PG_HOST=127.0.0.1
export DWN_PG_PORT=1234
export DWN_PG_DB=dwn_data_store_dev
export DWN_PG_USER=dwn-app
export DWN_PG_PWD=***
pnpm run test

```

6. Increment version number in package.json.  If the change is big enough to warrant a version update, then increase the version number in package.json. 

7. Commit changes and push branch

8. Merge with main branch

```
git checkout main
git merge upgrade/dwn-datastore-gcs-0.1.1
git push
```

## Build instructions

dwn-datastore-gcs needs to be built and deployed to the local artifact registry for the project

```
pnpm run build
```

Create [artifact registry](https://cloud.google.com/artifact-registry/docs/nodejs/store-nodejs) for npm type

```
gcloud config set artifacts/repository tbd-dwn-npm-registry
gcloud config set artifacts/location us-central1

gcloud artifacts print-settings npm --scope=@local-npm-registry
# insert output into /home/user/.npmrc

pnpm run artifactregistry-login
pnpm publish
```
