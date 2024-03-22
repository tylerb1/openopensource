import set from 'lodash.set'

export interface Tree {
  name: string,
  children: Tree[]
}

export interface FieldValues {
  newName?: string;
  newUrl?: string;
  initialResources?: { name: string, url: string }[];
  category1Name?: string;
  category2Name?: string;
  category?: any;
  children?: any;
}

export const getPath = (data: any) => {
  let path = [data.data.name];
  let parent = data.parent;
  while (parent) {
    path = [parent.data.name, ...path];
    parent = parent.parent;
  }
  return path;
}

const getPathToSubTree = (tree: Tree, path: string[], pointToCategory: boolean) => {
  let subTree = tree
  let pathString = 'children'
  let nextChildIndex = 0
  let i = 1
  while (subTree.name !== path[path.length - 1]) {
    nextChildIndex = subTree.children.findIndex((child: Tree) => child.name === path[i])
    pathString += `[${nextChildIndex}].children`
    subTree = subTree.children[nextChildIndex]
    i++
  }
  if (pointToCategory) { 
    const last = pathString.lastIndexOf('.children')
    pathString = pathString.slice(0, last)
  }
  return { pathString, subTree }
}

export const actions: { [key: string]: any }[] = [
  {
    name: 'New resource',
    category: [
      {
        fieldName: 'New resource name',
        fieldType: 'text',
      }, 
      {
        fieldName: 'New resource URL',
        fieldType: 'text',
      }
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Find the category in the tree and add the new resource
      const { pathString, subTree } = getPathToSubTree(tree, path, true)
      const newSubTree = { 
        name: subTree.name, 
        children: [...subTree.children, { 
          name: fieldValues.newName, 
          url: fieldValues.newUrl, 
          value: 1000 
        }]
      }
      if (newSubTree.children.length > 10) {
        return 'Current category would have more than the maximum allowed number (10) of items.'
      }
      set(tree, pathString, newSubTree)
      return tree
    }
  },
  {
    name: 'New category',
    category: [
      {
        fieldName: 'New category name',
        fieldType: 'text',
      }, 
      {
        fieldName: 'Initial resources (at least one required)',
        fieldType: 'resource-list',
      }
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Add the new category and its resources to the category with categoryName
      const { pathString, subTree } = getPathToSubTree(tree, path, false)
      const newSubTree = {
        name: subTree.name,
        children: [
          ...subTree.children,
          { name: fieldValues.newName, children: [
            ...fieldValues.initialResources!.map((r: any) => ({ name: r.name, url: r.url, value: 1000 }))
          ]}
        ]
      }
      set(tree, pathString, newSubTree)
      return tree
    }
  },
  {
    name: 'Move',
    resource: [
      {
        fieldName: 'Category to move into',
        fieldType: 'category',
      }
    ],
    resourceFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Move the resource with resourceName to the category specified in fieldValues
      const { subTree: resource } = getPathToSubTree(tree, path, true)
      const { pathString: parentPathString, subTree: parentSubTree } = getPathToSubTree(tree, path.slice(0, path.length - 1), false)

      let newCategoryPath = getPath(fieldValues.category.rootData)
      newCategoryPath = newCategoryPath.slice(0, path.length - 1)
      const { pathString: newPathString, subTree: newCategory } = getPathToSubTree(tree, newCategoryPath, false)
      const addedNode = [...newCategory.children, resource]
      if (addedNode.length > 10) {
        return 'Category with the new resource would have more than the maximum allowed number (10) of items.'
      }
      set(tree, newPathString, addedNode)
      
      const removedNode = [
        ...parentSubTree.children.filter((child: Tree) => child.name !== resource.name)
      ]
      set(tree, parentPathString, removedNode)
      return tree
    },
    category: [
      {
        fieldName: 'To category',
        fieldType: 'category',
      }
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Move the category with categoryName to the category specified in fieldValues
      const { subTree: category } = getPathToSubTree(tree, path, false)
      const { pathString: parentPathString, subTree: parentSubTree } = getPathToSubTree(tree, path.slice(0, path.length - 1), false)

      let newCategoryPath = getPath(fieldValues.category.rootData)
      const { pathString: newPathString, subTree: newCategory } = getPathToSubTree(tree, newCategoryPath, false)
      const addedNode = [...newCategory.children, category]
      if (addedNode.length > 10) {
        return 'Category that the current one is being moved to would have more than the maximum allowed number (10) of items.'
      }
      set(tree, newPathString, addedNode)
      
      const removedNode = [
        ...parentSubTree.children.filter((child: Tree) => child.name !== category.name)
      ]
      set(tree, parentPathString, removedNode)
      return tree
    }
  },
  {
    name: 'Delete',
    resource: [],
    resourceFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Delete the resource with resourceName from its category specified in fieldValues
      const { subTree: resource } = getPathToSubTree(tree, path, true)
      const { pathString: parentPathString, subTree: parentSubTree } = getPathToSubTree(tree, path.slice(0, path.length - 1), false)
      const removedNode = [
        ...parentSubTree.children.filter((child: Tree) => child.name !== resource.name)
      ]
      set(tree, parentPathString, removedNode)
      return tree
    }
  },
  {
    name: 'Update URL',
    resource: [
      {
        fieldName: 'New URL',
        fieldType: 'text',
      }
    ],
    resourceFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Update the URL of the resource with resourceName
      const { pathString } = getPathToSubTree(tree, path, true)
      const updatedNode = {
        name: fieldValues.newUrl,
        value: 1000,
      }
      set(tree, pathString, updatedNode)
      return tree
    }
  },
  {
    name: 'Merge',
    category: [
      {
        fieldName: 'New category name',
        fieldType: 'text',
      },
      {
        fieldName: 'Other category to merge into this one',
        fieldType: 'category',
      }
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Bring the resources of the other category into the current category, delete the other category, and update the name
      const { subTree: originalCategory } = getPathToSubTree(tree, path, false)
      const { pathString: parentPathString, subTree: parentCategory } = getPathToSubTree(tree, path.slice(0, path.length - 1), false)
      const removedNode = [...parentCategory.children.filter((child: Tree) => child.name !== originalCategory.name)]
      set(tree, parentPathString, removedNode)

      let otherCategoryPath = getPath(fieldValues.category.rootData)
      const { pathString: otherPathString, subTree: otherCategory } = getPathToSubTree(tree, otherCategoryPath, true)
      const mergedNode = {
        name: fieldValues.newName,
        children: [
          ...originalCategory.children,
          ...otherCategory.children
        ]
      }
      if (mergedNode.children.length > 10) {
        return 'New merged category would have more than the maximum allowed number (10) of items.'
      }
      set(tree, otherPathString, mergedNode)
      return tree
    }
  },
  {
    name: 'Split',
    category: [
      {
        fieldName: 'Category 1 name',
        fieldType: 'text',
      },
      {
        fieldName: 'Category 2 name',
        fieldType: 'text',
      },
      {
        fieldName: 'Resources for each category',
        fieldType: 'resource-picker',
      },
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Create two new categories with the specified names and resources; move resources for category 2 into new category
      const { pathString: originalPathString, subTree: originalSubtree } = getPathToSubTree(tree, path, true)
      const children1 = originalSubtree.children.filter((originalChild: Tree) => {
        const childInCategory1 = fieldValues
          .children
          .find((fieldValueChild: any) => fieldValueChild.name === originalChild.name)
          ?.category1
        return childInCategory1
      })
      const newNode1 = {
        name: fieldValues.category1Name,
        children: children1
      }
      set(tree, originalPathString, newNode1)

      const { pathString: parentPathString, subTree: parentCategory } = getPathToSubTree(tree, path.slice(0, path.length - 1), false)
      const children2 =  originalSubtree.children.filter((originalChild: Tree) => {
        const childInCategory2 = !fieldValues
          .children
          .find((fieldValueChild: any) => fieldValueChild.name === originalChild.name)
          ?.category1
        return childInCategory2
      })
      const newNode2 = [
        ...parentCategory.children,
        {
          name: fieldValues.category2Name,
          children: children2
        }
      ]
      set(tree, parentPathString, newNode2)
      return tree
    }
  },
  {
    name: 'Rename',
    resource: [
      {
        fieldName: 'New name',
        fieldType: 'text',
      },
    ],
    resourceFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Find the resource in the tree and update its name
      const { pathString } = getPathToSubTree(tree, path, true)
      const updatedNode = {
        name: fieldValues.newName,
        value: 1000,
      }
      set(tree, pathString, updatedNode)
      return tree
    },
    category: [
      {
        fieldName: 'New name',
        fieldType: 'text',
      },
    ],
    categoryFn: (tree: Tree, fieldValues: FieldValues, path: string[]) => {
      // Find the category in the tree and update its name
      const { pathString, subTree: category } = getPathToSubTree(tree, path, true)
      const updatedNode = {
        name: fieldValues.newName,
        children: category.children,
      }
      set(tree, pathString, updatedNode)
      return tree
    },
  },
];