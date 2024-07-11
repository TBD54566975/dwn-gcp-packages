# dwn-message-stream-pub-sub

This module will leverage Google Cloud PubSub for the DWN event stream.  This enables fast and scalable events that are available across multi-region deployments.

## Cloud Pubsub

Learn more about [PubSub here.](https://cloud.google.com/pubsub/docs/overview). Confirm that the pubsub api is enabled and the service account that the DWN server (and tests) are running under have permissions to read/write to PubSub.

## Code changes

1. If there are updates that need to happen, create a branch first and switch to it

`git checkout -b {branch-name}`

Example [(branch naming conventions)](https://medium.com/@abhay.pixolo/naming-conventions-for-git-branches-a-cheatsheet-8549feca2534)

`git checkout -b upgrade/dwn-message-stream-pub-sub-0.1.1`

2. Check that library versions are up to date.  Update package.json for versions of libraries. 

   * Confirm [@tbd54566975/dwn-sdk-js](https://github.com/TBD54566975/dwn-sdk-js/blob/main/package.json) version is up to date.  This directly affects this library and more likely to change
   * Confirm [@google-cloud/pubsub](https://cloud.google.com/nodejs/docs/reference/pubsub/latest) is up to date
   * Other libraries won't change as often, but good to compare every so often to confirm library versions are matching.

3. Update other source files as needed
4. Run tests

* Run `pnpm install`  to update libraries
* Set env variables
* configure gcloud auth

To run tests at the command line: 
```
pnpm install
gcloud auth login --update-adc
gcloud config set project {project-id}
gcloud auth application-default set-quota-project {project-id}

export DWN_PROJECT_ID={project_id}
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

dwn-gcs-datastore needs to be built and deployed to the local artifact registry for the project

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
