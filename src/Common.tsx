import 'azure-devops-ui/Core/override.css';
import * as SDK from 'azure-devops-extension-sdk';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './Common.scss';
import { CommonServiceIds, IGlobalMessagesService } from 'azure-devops-extension-api';

export function showRootComponent(component: React.ReactElement<any>) {
  ReactDOM.render(component, document.getElementById('root'));
}

export async function retryableApiCall<T>(apiCall: (...apiCallArgs: any[]) => Promise<T>, ...args: any[]): Promise<T> {
  try {
    return await apiCall(...args);
  } catch (e) {
    const globalMessagesSvc = await SDK.getService<IGlobalMessagesService>(CommonServiceIds.GlobalMessagesService);
    globalMessagesSvc.addToast({
      duration: 5000,
      message: String(e),
    });

    throw e;
  }
}
