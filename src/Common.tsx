import 'azure-devops-ui/Core/override.css';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import './Common.scss';

export function showRootComponent(component: React.ReactElement<any>) {
  ReactDOM.render(component, document.getElementById('root'));
}
