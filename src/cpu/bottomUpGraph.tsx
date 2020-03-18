/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ILocation, IProfileModel, IComputedNode, IGraphNode, Category } from './model';

class BottomUpNode implements IGraphNode {
  public children = new Map<number, BottomUpNode>();
  public aggregateTime = 0;
  public selfTime = 0;
  public ticks = 0;

  public get id() {
    return this.location.id;
  }

  public get callFrame() {
    return this.location.callFrame;
  }

  public get src() {
    return this.location.src;
  }

  public get category() {
    return this.location.category;
  }

  constructor(public readonly location: ILocation, public readonly parent?: BottomUpNode) {}

  public addNode(node: IComputedNode) {
    this.selfTime += node.selfTime;
    this.aggregateTime += node.aggregateTime;
    this.parent?.addNode(node);
  }
}

const processNode = (aggregate: BottomUpNode, node: IComputedNode, model: IProfileModel) => {
  let child = aggregate.children.get(node.locationId);
  if (!child) {
    child = new BottomUpNode(model.locations[node.locationId], aggregate);
    aggregate.children.set(node.locationId, child);
  }

  child.addNode(node);

  if (node.parent) {
    processNode(child, model.nodes[node.parent], model);
  }
};

/**
 * Creates a bottom-up graph of the process information
 */
export const createBottomUpGraph = (model: IProfileModel) => {
  const byLocation: IComputedNode[][] = new Array(model.locations.length).fill([]);
  for (const node of model.nodes) {
    byLocation[node.locationId].push(node);
  }

  const root = new BottomUpNode({
    id: -1,
    category: Category.System,
    selfTime: 0,
    aggregateTime: 0,
    ticks: 0,
    callFrame: { functionName: '(root)', lineNumber: -1, columnNumber: -1, scriptId: '0', url: '' },
  });

  for (const node of model.nodes) {
    if (node.children.length === 0) {
      processNode(root, node, model);
    }
  }

  return root;
};
