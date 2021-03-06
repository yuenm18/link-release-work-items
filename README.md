# Link Work Items from Release 

[![Build Status](https://dev.azure.com/yuenm18/Extensions/_apis/build/status/yuenm18.link-release-work-items?branchName=master)](https://dev.azure.com/yuenm18/Extensions/_build/latest?definitionId=1&branchName=master)

![Demo of Extension](https://raw.githubusercontent.com/yuenm18/link-release-work-items/master/images/extension-demo.gif)

## Features

This extension adds an action to the work item context menu which links all new work items from a selected release's deployment to the current work item.  The new work items are determined by taking the difference between the selected release deployment's work items and the previous deployment's work item.

The queries to fetch this data are almost identical to those which are used to display the "Difference in work items" on the release pipeline page.

![Existing Release Functionality](https://raw.githubusercontent.com/yuenm18/link-release-work-items/master/images/existing-functionality.png)

## References

* https://github.com/microsoft/azure-devops-extension-sample
* https://developer.microsoft.com/en-us/azure-devops/develop/extensions
* https://docs.microsoft.com/en-us/azure/devops/extend/overview