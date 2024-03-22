<script lang="ts">
	import Modal from './Modal.svelte';
	import { actions, type Tree } from './utils';
  import { type FieldValues } from './utils';

  export let clickedObjectType: string
  export let clickedAction: any = null
  export let currentNode: any = null
  export let choosingCategoryForForm: boolean
  export let categoryForForm: any = null
  export let currentNodeChildrenNames: any = []
  export let tree: Tree
  export let root: any
  export let clickedCategory: (name: string, e?: any) => void;
  export let toggleChoosingCategoryForForm: (shouldCancel: boolean) => void;
  export let updateTree: (newTree: Tree, newCategoryName: string) => void;
  export let setClickAction: (action: any) => void;

  let newResourceFields: { name: string, url: string }[] = [{ name: '', url: '' }]
  let text1 = ''
  let text2 = ''
  let formError = ''
  let attemptedSubmit = false
  let formValid = false
  let fieldValues: FieldValues = {};
  let showConfirmModal = false;

  $: {
    if ((text1 || text2 || newResourceFields || categoryForForm) && attemptedSubmit) {
      setFieldValues()
      validateForm()
    }
  }

  const submitForm = () => {
    setFieldValues()
    validateForm()
    if (formValid) {
      showConfirmModal = true
    }
    attemptedSubmit = true
  }

  const reset = () => {
    attemptedSubmit = false
    newResourceFields = [{ name: '', url: '' }]
    text1 = ''
    text2 = ''
    formValid = false
    formError = ''
    fieldValues = {};
  }

  const setFieldValues = () => {
    fieldValues = {}
    if (clickedObjectType === 'resource') {
      if (clickedAction.name === 'Move') {
        fieldValues.category = categoryForForm
      } else if (clickedAction.name === 'Update URL') {
        fieldValues.newUrl = text1
      } else if (clickedAction.name === 'Rename') {
        fieldValues.newName = text1
      }
    } else {
      if (clickedAction.name === 'New resource') {
        fieldValues.newName = text1
        fieldValues.newUrl = text2
      } else if (clickedAction.name === 'New category') {
        fieldValues.newName = text1
        fieldValues.initialResources = newResourceFields
      } else if (clickedAction.name === 'Move') {
        fieldValues.category = categoryForForm
      } else if (clickedAction.name === 'Merge') {
        fieldValues.newName = text1
        fieldValues.category = categoryForForm
      } else if (clickedAction.name === 'Split') {
        fieldValues.category1Name = text1
        fieldValues.category2Name = text2
        fieldValues.children = structuredClone(currentNodeChildrenNames)
      } else if (clickedAction.name === 'Rename') {
        fieldValues.newName = text1
      }
    }
  }

  const submitChange = () => {
    const newTree = clickedObjectType === 'resource' 
      ? clickedAction.resourceFn(tree, fieldValues, currentNode.path)
      : clickedAction.categoryFn(tree, fieldValues, currentNode.path)
    if (typeof(newTree) === 'string') {
      formValid = false
      formError = newTree
    } else {
      const newCategoryName = clickedAction.name === 'Move' || clickedAction.name === 'Merge' 
        ? fieldValues.category.name 
        : ''
      updateTree(newTree, newCategoryName)
      reset()
    }
  }

  const validateForm = () => {
    formError = ''
    Object.keys(fieldValues).forEach((key) => {
      if (key.includes('Name')) {
        if (fieldValues[key as keyof FieldValues] === '') {
          formError = 'Name missing'
        } else if (fieldValues[key as keyof FieldValues].length > 50) {
          formError = 'Name must be less than 50 characters'
        } else if (clickedAction.name === 'Rename' && fieldValues[key as keyof FieldValues] === currentNode.name) {
          formError = 'New name must be different'
        } else if (root.descendants().some((r: any) => r.data.name === fieldValues[key as keyof FieldValues])) {
          formError = 'Another category or resource already has this name'
        }
      } else if (key.includes('Url')) {
        if (!isValidUrl(fieldValues[key as keyof FieldValues])) {
          formError = 'Invalid URL'
        } else if (clickedAction.name === 'Update Url' && fieldValues[key as keyof FieldValues] === currentNode.url) {
          formError = 'New URL must be different'
        }
      } else if (key.includes('category')) {
        if (!fieldValues[key as keyof FieldValues]) {
          formError = 'Category missing'
        }
      } else if (key.includes('Resources')) {
        fieldValues[key as keyof FieldValues].forEach((resource: { name: string, url: string }, index: number) => {
          if (resource.name === '' || resource.url === '') {
            formError = 'Include a name and URL for each resource'
          } else if (!isValidUrl(resource.url)) {
            formError = 'Invalid URL for resource ' + (index + 1)
          } else if (resource.name.length > 50) {
            formError = 'All names must be less than 50 characters'
          }
        })
      }
    })

    formValid = !formError
    if (formValid) formError = ''
  }

  const isValidUrl = (str: string) => {
    const pattern = new RegExp(
      '^([a-zA-Z]+:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR IP (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', // fragment locator
      'i'
    );
    return pattern.test(str) && str.length < 2083;
  }

  const removeNewResourceField = (index: number) => {
    newResourceFields = [...newResourceFields.filter((_: any, i: number) => i !== index)]
  }

  const handleCheckboxChange = (e: any, isCategory1: boolean, resource: any) => {
    resource.category1 = isCategory1 ? e?.target?.checked : !e?.target?.checked
    currentNodeChildrenNames = currentNodeChildrenNames.map((r: any) => r.name === resource.name ? resource : r)
  }
</script>

<div class="
  menu
  flex 
  flex-col 
  flex-wrap 
  basis-0
  gap-4 
  text-sm
  pt-4
">
  {#if currentNode}
    <!-- CURRENT SELECTION PATH -->
    <div class="flex flex-row flex-wrap items-center whitespace-nowrap max-w-72">
      <p>Current selection:&nbsp;</p>

      {#each currentNode.path as pathSegment, index}
        <button 
          class="
            {pathSegment === currentNode.name && currentNode.url 
              ? 'text-green-600' 
              : ''} 
            bg-transparent 
            py-0 
            px-1 
            font-bold 
            min-h-6
          " 
          on:click={() => {
            if (pathSegment === currentNode.name && currentNode.url) {
              window.open(currentNode.url, "_blank")
            } else {
              clickedCategory(pathSegment)
            }
          }}
        >{pathSegment}</button>

        {#if index !== currentNode.path.length - 1}
          <span class="mx-0 px-1 text-lg relative top-[-1px]">{'›'}</span>
        {/if}
      {/each}
    </div>
  {/if}

  {#if clickedObjectType !== ''}
    <div class="flex flex-col text-start gap-4">
      <!-- ACTION BUTTONS -->
      <div class="flex flex-row flex-wrap items-center gap-2 max-w-72">
        {#each actions.filter((a) => {
          return clickedObjectType in a && 
            !(a.name === 'Split' && currentNodeChildrenNames?.length < 2) &&
            !((a.name === 'Move' || a.name === 'Split') && currentNode.name === tree.name)
        }) as action}
          <button 
            class="{clickedAction?.name === action.name ? 'bg-green-600' : 'bg-green-800'} px-2 py-1"
            on:click={() => {
              reset()
              if (clickedAction && clickedAction.name === action.name) { 
                setClickAction(null)
              } else {
                setClickAction(actions.find((a) => a.name === action.name))
                if (action.name === 'Rename') {
                  text1 = currentNode.name
                } else if (action.name === 'Update URL') {
                  text1 = currentNode.url
                }
              }
            }}
          >
            {action.name}
          </button>
        {/each}
      </div>

      <!-- FORM FIELDS FOR ACTION -->
      {#if clickedAction}
        {#if clickedAction.name !== 'Delete'}
          <hr />
        {/if}
        <form on:submit|preventDefault={submitForm}>
          <div class="action-form-fields flex flex-col gap-2">
            {#each clickedAction[clickedObjectType] as field, index}
              <div class="form-field flex flex-col gap-2 mb-2">
                <label class="font-bold" for={field.fieldName}>{field.fieldName}:</label>

                {#if field.fieldType === 'text'}
                  {#if index === 0}
                    <input 
                      class="w-full px-2 py-1 rounded-sm"
                      type="text" 
                      id={field.fieldName} 
                      name={field.fieldName} 
                      bind:value={text1}
                    />
                  {:else}
                    <input 
                      class="w-full px-2 py-1 rounded-sm"
                      type="text" 
                      id={field.fieldName} 
                      name={field.fieldName} 
                      bind:value={text2}
                    />
                  {/if}
                {:else if field.fieldType === 'resource-list'}
                  {#each newResourceFields as _, index}
                    <div class="flex flex-row gap-2">
                      <input 
                        class="w-28 px-2 py-1 rounded-sm"
                        type="text" 
                        id={`resource-name-${index}-name`} 
                        name={`resource-name-${index}-name`} 
                        placeholder="Name" 
                        bind:value={newResourceFields[index].name}
                      />

                      <input 
                        class="w-28 px-2 py-1 rounded-sm"
                        type="text" 
                        id={`resource-url-${index}-url`} 
                        name={`resource-url-${index}-url`} 
                        placeholder="URL" 
                        bind:value={newResourceFields[index].url}
                      />

                      {#if !(index === 0 && newResourceFields.length < 2)}
                        <button class="px-1 py-1 rounded-lg" on:click={() => removeNewResourceField(index)}>
                          <svg class="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14"/>
                          </svg>
                        </button>
                      {/if}
                      {#if index === newResourceFields.length - 1 && newResourceFields.length <= 10}
                        <button class="px-1 py-1 rounded-lg" on:click={() => newResourceFields = [
                          ...newResourceFields, 
                          { name: '', url: '' }
                        ]}>
                          <svg class="w-4 h-4 text-gray-800 dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7 7V5"/>
                          </svg>
                        </button>
                      {/if}
                    </div>
                  {/each}
                {:else if field.fieldType === 'resource-picker'}
                  <div class="grid grid-cols-[max-content_max-content]">
                    {#each currentNodeChildrenNames as resource}
                      <p class="mr-4">{resource.name}</p>

                      <div>
                        <input 
                          type="radio" 
                          checked={resource.category1} 
                          on:change={(e) => handleCheckboxChange(e, true, resource)} 
                        />
                        <label for="one">1</label>

                        <input 
                          type="radio" 
                          checked={!resource.category1} 
                          on:change={(e) => handleCheckboxChange(e, false, resource)} />
                        <label for="two">2</label>
                      </div>
                    {/each}
                  </div>
                {:else if field.fieldType === 'category'}
                  {#if categoryForForm}
                    <div class="flex flex-row flex-wrap items-center whitespace-nowrap max-w-72">
                      {#each categoryForForm.path as pathSegment, index}
                          <p class="text-xs py-0 px-1 font-bold">{pathSegment}</p>

                        {#if index !== categoryForForm.path.length - 1}
                          <span class="mx-0 text-md">{'›'}</span>
                        {/if}
                      {/each}
                    </div>
                  {:else if choosingCategoryForForm}
                    <p class="text-xs italic">
                      Navigate to the category you'd like to<br>{clickedAction.name === 'Merge' ? 'merge into this one.' : 'move this one into.'}
                    </p>
                  {/if}

                  <div class="flex flex-row gap-2 items-center mt-1">
                    {#if choosingCategoryForForm}
                      <button 
                        class="bg-green-900 w-36 px-2"
                        on:click={() => toggleChoosingCategoryForForm(true)}
                      >
                        Clear
                      </button>
                    {:else}
                      <button 
                        class="bg-green-950 w-36 px-2"
                        on:click={() => toggleChoosingCategoryForForm(false)}
                      >
                        Select
                      </button>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}

            {#if formError !== ''}
              <p class="text-sm font-bold text-red-400">{formError}</p>
            {/if}

            <hr />

            <div class="flex flex-row gap-2">
              <button 
                class="w-36 px-2 mt-2 bg-green-600"
                on:click={submitForm}
              >
                Submit
              </button>

              <button 
                class="w-36 px-2 mt-2 bg-green-900"
                on:click={() => {
                  reset()
                  setClickAction(null)
                }}
                  
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      {/if}
    </div>
  {/if}
</div>

<Modal bind:showModal={showConfirmModal} isConfirm confirmFn={submitChange}>
	<h2 class="mb-2" slot="header">
		Are you sure you want to make this change?
	</h2>
</Modal>