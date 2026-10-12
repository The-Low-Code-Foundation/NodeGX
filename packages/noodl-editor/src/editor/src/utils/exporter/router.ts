import { getNodesWithType } from './util';

export function getRouterComponents(allComponents) {
  const routers = getNodesWithType('Router', allComponents);

  let pageComponents = [];
  for (const router of routers) {
    if (router.parameters.pages && router.parameters.pages.routes) {
      pageComponents = pageComponents.concat(
        router.parameters.pages.routes.map((componentName) => allComponents.find((c) => c.name === componentName))
      );
    }
  }

  return pageComponents.filter((c) => c !== undefined);
}

function _getPageInfo(allComponents: TSFixme) {
  const pages = getNodesWithType('Page', allComponents);

  const pageInfo = pages.map((page) => {
    const component = page.owner.owner;

    let title = page.parameters.title;
    if (title === undefined) {
      const titleParts = component.name.split('/');
      title = titleParts[titleParts.length - 1];
    }

    let urlPath = page.parameters['urlPath'] || title.replace(/\s+/g, '-').toLowerCase();

    // // Make sure all path parameters are in the path
    const pageInputs = component.getNodesWithType('PageInputs');
    const pathParams = [];
    pageInputs.forEach((pi) => {
      if (pi.parameters['pathParams'])
        pi.parameters['pathParams'].split(',').forEach((p) => pathParams.indexOf(p) === -1 && pathParams.push(p));
    });

    pathParams.forEach((p) => {
      if (urlPath.indexOf('{' + p + '}') === -1) urlPath = urlPath + '/{' + p + '}';
    });

    return {
      path: urlPath,
      title: title,
      component: component.name
    };
  });

  return pageInfo;
}

export function getRouterIndex(allComponents: TSFixme) {
  //build an index with all routers and pages so the viewer know what components to load without
  //having load the entire graph at once
  // P109-S18: a Router left with no Name is Main, as the runtime registers it (`router-handler.ts` `name || 'Main'`)
  // and as the Router's Name port tells a person to leave it when there is only one. Leaving it out of the index made
  // every URL open its start page in a deployed app.
  const routers = getNodesWithType('Router', allComponents);

  const routerInfo = routers.map((router) => ({ ...router.parameters, name: router.parameters.name || 'Main' }));

  return {
    routers: routerInfo,
    pages: _getPageInfo(allComponents)
  };
}
