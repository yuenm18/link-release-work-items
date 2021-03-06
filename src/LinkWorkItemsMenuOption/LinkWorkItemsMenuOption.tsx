import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds, IHostPageLayoutService, IPanelOptions } from 'azure-devops-extension-api';

SDK.init().then(() => {
  SDK.register(SDK.getContributionId(), () => {
    return {
      execute: async (context: any) => {
        const layoutService = await SDK.getService<IHostPageLayoutService>(CommonServiceIds.HostPageLayoutService);

        const contributionId = SDK.getExtensionContext().id + '.select-release-panel';

        const panelOptions: IPanelOptions<string[]> = {
          title: 'Choose Release',
          description: 'Select a release to link work items',
          configuration: {
            currentProjectId: context.currentProjectGuid,
          },
        };

        layoutService.openPanel(contributionId, panelOptions);
      },
    };
  });
});
