import './SelectReleasePanel.scss';

import * as React from 'react';
import * as SDK from 'azure-devops-extension-sdk';

import { Button } from 'azure-devops-ui/Button';
import { ButtonGroup } from 'azure-devops-ui/ButtonGroup';
import { showRootComponent } from '../Common';

import { EditableDropdown } from 'azure-devops-ui/EditableDropdown';
import { IListBoxItem, ListBoxItemType } from 'azure-devops-ui/ListBox';
import { getClient } from 'azure-devops-extension-api';
import { ObservableArray, ObservableValue } from 'azure-devops-ui/Core/Observable';

import { CoreRestClient } from 'azure-devops-extension-api/Core';
import { ReleaseRestClient, Release, DeploymentStatus, DeploymentOperationStatus, ReleaseQueryOrder, ReleaseEnvironment, ProjectReference, Deployment } from 'azure-devops-extension-api/Release';
import { WorkItemTrackingRestClient, IWorkItemFormService, WorkItemTrackingServiceIds, WorkItemRelation, WorkItem } from 'azure-devops-extension-api/WorkItemTracking';
import { Table, renderSimpleCell, ISimpleTableCell, ColumnFill } from 'azure-devops-ui/Table';

interface IPanelContentState {
  selectedProject: ProjectReference | undefined;
  selectedRelease: Release | undefined;
  selectedReleaseEnvironment: ReleaseEnvironment | undefined;
  previousDeployment: Deployment | undefined;
  workItemUrls: string[];
}

class SelectReleasePanel extends React.Component<{}, IPanelContentState> {
  private projectSearchResult: ObservableArray<IListBoxItem<ProjectReference>>;
  private releaseSearchResults: ObservableArray<IListBoxItem<Release>>;
  private releaseEnvironmentSearchResults: ObservableArray<IListBoxItem<ReleaseEnvironment>>;
  private workItems: ObservableArray<ISimpleTableCell | ObservableValue<ISimpleTableCell | undefined>>;

  private getReleaseDisplay = (release: Release | undefined): string => release ? `${release.id} - ${release.name} - ${release.releaseDefinition.name}` : '';
  private getReleaseEnvironmentDisplay = (releaseEnvironment: ReleaseEnvironment | undefined): string => releaseEnvironment ? releaseEnvironment.name : '';
  private getProjectDisplay = (projectReference: ProjectReference | undefined): string => projectReference ? projectReference.name : '';

  private get projectId(): string {
    return this.state.selectedProject?.id ?? '';
  }

  constructor(props: {}) {
    super(props);

    // can't stick these in the state because they don't work with the components expecting an Observable
    this.projectSearchResult = new ObservableArray<IListBoxItem<ProjectReference>>();
    this.releaseSearchResults = new ObservableArray<IListBoxItem<Release>>();
    this.releaseEnvironmentSearchResults = new ObservableArray<IListBoxItem<ReleaseEnvironment>>();
    this.workItems = new ObservableArray<ISimpleTableCell>();

    this.state = {
      selectedProject: undefined,
      selectedRelease: undefined,
      selectedReleaseEnvironment: undefined,
      previousDeployment: undefined,
      workItemUrls: [],
    };
  }

  public componentDidMount() {
    SDK.init();

    SDK.ready().then(async () => {
      this.getProjects();
    });
  }

  public render(): JSX.Element {
    return (
      <div className="flex-column">
        <div>
          <EditableDropdown
            ariaLabel="Project Selection"
            className="margin-8"
            items={this.projectSearchResult}
            onValueChange={this.onValueChangeProject}
            placeholder="Select a Project"
          />
          <EditableDropdown
            ariaLabel="Release Selection"
            className="margin-8"
            items={this.releaseSearchResults}
            onValueChange={this.onValueChangeRelease}
            onTextChange={this.onTextChangeRelease}
            placeholder="Select a Release"
            disabled={!this.state.selectedProject}
          />
          <EditableDropdown
            ariaLabel="Release Environment Selection"
            className="margin-8"
            items={this.releaseEnvironmentSearchResults}
            onValueChange={this.onValueChangeReleaseEnvironment}
            placeholder="Select a Release Environment"
            disabled={!this.state.selectedRelease}
          />
        </div>
        <div className="full-size-overflow">
          {this.state.previousDeployment && <div className="text-center">Showing changes compared to <b>{this.state.previousDeployment.release.name}</b> (Previous deployment)</div>}
          <div>
            <Table<ISimpleTableCell | ObservableValue<ISimpleTableCell | undefined>> ariaLabel="Work Items Related to Release" columns={[
              {
                id: 'id',
                name: 'Id',
                readonly: true,
                renderCell: renderSimpleCell,
                width: new ObservableValue(50),
              },
              {
                id: 'type',
                name: 'Type',
                readonly: true,
                renderCell: renderSimpleCell,
                width: new ObservableValue(100),
              },
              {
                id: 'title',
                name: 'Title',
                readonly: true,
                renderCell: renderSimpleCell,
                width: new ObservableValue(150),
              },
              ColumnFill,
              {
                id: 'state',
                name: 'State',
                readonly: true,
                renderCell: renderSimpleCell,
                width: new ObservableValue(100),
              },
            ]} itemProvider={this.workItems} role="table" />
          </div>
        </div>
        <ButtonGroup className="flex-row justify-end margin-8">
          <Button
            text="OK"
            primary={true}
            disabled={!this.areThereAnyWorkItem()}
            onClick={() => this.dismiss(true)}
          />
          <Button
            text="Cancel"
            onClick={() => this.dismiss(false)}
          />
        </ButtonGroup>
      </div>
    );
  }

  private getProjects = async (): Promise<void> => {
    this.projectSearchResult.splice(0, this.projectSearchResult.length, ...(await getClient(CoreRestClient).getProjects()).map((p) => {
      const project = {
        id: p.id,
        data: p,
        text: this.getProjectDisplay(p),
      };

      return project;
    }));
  }

  private onValueChangeProject = async (value?: IListBoxItem<ProjectReference>): Promise<void> => {
    const selectedProject = value?.data;
    if (!selectedProject) {
      return;
    }

    this.setState({
      ...this.state,
      selectedProject,
      selectedRelease: undefined,
      selectedReleaseEnvironment: undefined,
      workItemUrls: [],
      previousDeployment: undefined,
    });

    this.workItems.removeAll();
    await this.onTextChangeRelease(null, '');
  };


  private areThereAnyWorkItem = (): boolean => {
    return !!this.state.workItemUrls.length;
  }

  private onTextChangeRelease = async (_event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.SyntheticEvent<HTMLElement> | null, value?: string): Promise<void> => {
    this.releaseSearchResults.splice(0, this.releaseSearchResults.length, { id: 'loading', type: ListBoxItemType.Loading });

    const releases: Release[] = await getClient(ReleaseRestClient).getReleases(this.projectId, undefined, undefined, value);
    if (value && !isNaN(Number(value))) {
      // support searching by release id
      releases.unshift(...await getClient(ReleaseRestClient).getReleases(this.projectId,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          [+value]));
    }

    const releaseResults = releases.map((r) => {
      const release = {
        id: String(r.id),
        data: r,
        text: this.getReleaseDisplay(r),
      };

      return release;
    });

    this.releaseSearchResults.splice(0, this.releaseSearchResults.length, ...releaseResults);
  }

  private onValueChangeRelease = async (value?: IListBoxItem<Release>): Promise<void> => {
    let selectedRelease = value?.data;
    if (!selectedRelease) {
      return;
    }

    selectedRelease = await getClient(ReleaseRestClient).getRelease(this.projectId, selectedRelease.id);
    this.setState({
      ...this.state,
      selectedRelease,
      selectedReleaseEnvironment: undefined,
      workItemUrls: [],
      previousDeployment: undefined,
    });

    this.workItems.removeAll();

    this.releaseEnvironmentSearchResults.splice(0, this.releaseEnvironmentSearchResults.length, ...selectedRelease.environments.map((e) => {
      const release = {
        id: String(e.id),
        data: e,
        text: this.getReleaseEnvironmentDisplay(e),
      };

      return release;
    }));
  };

  private onValueChangeReleaseEnvironment = async (value?: IListBoxItem<ReleaseEnvironment>): Promise<void> => {
    const selectedReleaseEnvironment = value?.data;
    if (!this.state.selectedRelease || !selectedReleaseEnvironment) {
      return;
    }

    this.workItems.removeAll();
    this.workItems.push(new ObservableValue(undefined));

    // Azure devops grabs the last deployment step and uses that when searching for the previous deployemnt
    const deploymentAttemptsForReleaseEnvironment = this.state.selectedRelease.environments.find((e) => e.id == selectedReleaseEnvironment.id)?.deploySteps;
    const mostRecentDeploymentId = deploymentAttemptsForReleaseEnvironment?.[deploymentAttemptsForReleaseEnvironment.length - 1]?.deploymentId;
    if (!mostRecentDeploymentId) {
      return;
    }

    // Copy this url exactly
    // https://<org>.vsrm.visualstudio.com/<project>/_apis/Release/deployments?definitionId=18&definitionEnvironmentId=85&deploymentStatus=30&operationStatus=7960&latestAttemptsOnly=true&queryOrder=0&%24top=50&continuationToken=107925
    const deployments = (await getClient(ReleaseRestClient).getDeployments(
        this.state.selectedRelease.projectReference.id,
        this.state.selectedRelease.releaseDefinition.id,
        selectedReleaseEnvironment.definitionEnvironmentId,
        undefined,
        undefined,
        undefined,
        DeploymentStatus.Failed + DeploymentStatus.PartiallySucceeded + DeploymentStatus.Succeeded + DeploymentStatus.InProgress, // 30
        DeploymentOperationStatus.PhaseCanceled + DeploymentOperationStatus.Canceled + DeploymentOperationStatus.PhaseFailed + DeploymentOperationStatus.PhasePartiallySucceeded + DeploymentOperationStatus.PhaseSucceeded + DeploymentOperationStatus.Rejected + DeploymentOperationStatus.Approved, // 7960
        true,
        ReleaseQueryOrder.Descending,
        2,
        mostRecentDeploymentId));

    if (!deployments.length) {
      return;
    }

    const previousDeployment = deployments[1];

    const workItemRefs = [];
    for (const artifact of this.state.selectedRelease.artifacts) {
      workItemRefs.push(...await getClient(ReleaseRestClient).getReleaseWorkItemsRefs(
          this.state.selectedRelease.projectReference.id,
          this.state.selectedRelease.id,
          previousDeployment?.release.id,
          undefined,
          artifact.alias));
    }

    this.workItems.removeAll();

    for (let i = 0; i < workItemRefs.length; i++) {
      this.workItems.push(new ObservableValue(undefined));

      const workItem: WorkItem = await getClient(WorkItemTrackingRestClient).getWorkItem(+workItemRefs[i].id, this.state.selectedRelease.projectReference.id);
      workItemRefs[i] = {
        id: String(workItem.id),
        type: workItem.fields['System.WorkItemType'],
        title: workItem.fields['System.Title'],
        state: workItem.fields['System.State'],
        url: workItem.url,
      };

      this.workItems.change(this.workItems.length - 1, { ...workItemRefs[i] });
    }

    const workItemUrls = workItemRefs.map((w) => w.url);
    this.setState({
      ...this.state,
      selectedReleaseEnvironment,
      workItemUrls,
      previousDeployment,
    });
  };

  private dismiss = async (useValue: boolean): Promise<void> => {
    if (useValue) {
      await (await SDK.getService<IWorkItemFormService>(WorkItemTrackingServiceIds.WorkItemFormService)).addWorkItemRelations(this.state.workItemUrls.map((url) => {
        const relation: WorkItemRelation = {
          rel: 'Related',
          url: url,
          attributes: {
            'comment': 'Making a new link for the dependency',
          },
        };

        return relation;
      }));
    }

    const configuration = SDK.getConfiguration();
    configuration.panel?.close(useValue ? this.state.selectedRelease : undefined);
  }
}

showRootComponent(<SelectReleasePanel />);
