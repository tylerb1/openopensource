<script lang="ts">
  import { createClient } from '@supabase/supabase-js'
  import { interpolateZoom, interpolateHcl } from 'd3-interpolate'
  import { hierarchy, pack } from 'd3-hierarchy'
  import { transition } from 'd3-transition'
  import { scaleLinear } from 'd3-scale'
  import { type Tree } from './utils'
	import { onMount } from 'svelte';
  import Menu from './Menu.svelte'
  import Modal from './Modal.svelte';

  /* INITIALIZATION */

  const supabaseUrl = import.meta.env.VITE_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY
  const sb = createClient(supabaseUrl, supabaseAnonKey)

  // Tree & UI state
  let tree: Tree
  let svgWidth = 300
  let svgHeight = 300
  let innerWidth: number
  let innerHeight: number
  let root: any
  let view: any
  let activeFocus: any
  let activeZoomA: number
  let activeZoomB: number
  let activeZoomK: number
  let packFunc: (data: Tree) => void

  // Other UI state
  let isMenuOpen = false
  let showInfoModal = false
  let hasUpdated = false
  let clickedObjectType = "category"
  let clickedAction: any
  let currentNode: any
  let choosingCategoryForForm = false
  let categoryForForm: any
  let postUpdateZoomCategoryName: string

  onMount(async () => {
    const fetchedTree = await getTree()
    tree = fetchedTree
    currentNode = { name: fetchedTree.name, path: [fetchedTree.name], url: null }
    setPackFunc()
    resetRoot()
    resetActiveFocus()
  })

  /* UTILITY FUNCTIONS */

  const getTree = async () => {
    const { data, error } = await sb
      .from('tree')
      .select()
      .eq('id', 1)
    if (error) {
      console.error(error)
      return null
    } else if (data.length) {
      return data[0].current_state
    } else {
      console.error("No data found")
      return null
    }
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

  const setPackFunc = () => {
    packFunc = (data: any) => pack()
      .size([svgWidth, svgHeight])
      .radius((d) => !d.value ? 5 : d.value / 200)
      .padding(4)
      (hierarchy(data)
        .sum(d => d.value)
        .sort((a: any, b: any) => b.value - a.value));
  }

  const returnToCurrentNode = () => {
    clickedCategory(currentNode?.name)
  }

  const color = scaleLinear<string, number>()
    .domain([0, 5])
    .range(["#111111", "#15803d"])
    .interpolate(interpolateHcl);

  const inactiveZoomTo = (v: any) => {
    activeZoomK = svgWidth / v[2];
    activeZoomA = v[0];
    activeZoomB = v[1];
    view = v;
  };

  const resetActiveFocus = () => {
    activeFocus = root;
    activeZoomA = root.x;
    activeZoomB = root.y;
    activeZoomK = svgWidth / root.r * 2;
    inactiveZoomTo([root.x, root.y, root.r * 2]);
  }

  const resetRoot = () => {
    if (tree) {
      root = packFunc(tree)
    }
  }

  /* UPDATES */

  const updateCurrentNode = () => {
    if (postUpdateZoomCategoryName) {
      clickedCategory(postUpdateZoomCategoryName)
      postUpdateZoomCategoryName = ''
    } else if (currentNode?.path?.length >= 2) {
      clickedCategory(currentNode.path[currentNode.path.length - 1])
    } else {
      clickedCategory(tree.name)
    }
  }

  const updateTree = async (newTree: Tree, newCategoryName: string) => {
    if (newCategoryName) {
      postUpdateZoomCategoryName = newCategoryName
    }
    clickedObjectType = "category"
    clickedAction = null
    categoryForForm = null
    choosingCategoryForForm = false
    hasUpdated = true
    tree = newTree
    const { error } = await sb
      .from('tree')
      .update({ 'current_state': newTree })
      .eq('id', 1)
      .select()
    if (error) {
      console.error(error)
    }
  }

  $: {
    // Rerender SVG on screen width change
    if (innerWidth) {
      if (innerWidth < innerHeight) {
        innerHeight = innerWidth;
      } else {
        innerWidth = innerHeight;
      }
      svgWidth = innerWidth;
      svgHeight = innerHeight;
      setPackFunc()
      resetRoot()
      returnToCurrentNode()
    }
  }

  $: if (tree) {
    resetRoot()
    if (!hasUpdated) {
      resetActiveFocus()
    } else {
      updateCurrentNode()
    }
  }

  $: currentNodeChildrenNames = !currentNode 
    ? null 
    : root.descendants()?.find((d: any) => {
      return currentNode.name === d.data.name
    })?.children?.map((c: any) => {
      return {
        name: c.data.name,
        category1: false
      }
    })

  /* INTERACTIONS */

  const zoom = (d: any, e: any) => {
    if (e) {
      e.stopPropagation();
    }
    activeFocus = d;
    transition()
      .duration(750)
      .tween('zoom', () => {
        var i = interpolateZoom(
          view, 
          [
            activeFocus.x, 
            activeFocus.y, 
            activeFocus.r * 2
          ]
        );
        return function(t: any) { 
          inactiveZoomTo(i(t)); 
        };
      });
  };

  const getRepoInfo = async (owner: string, repo: string) => {
    const url = `https://api.github.com/repos/${owner}/${repo}`;
    const response = await fetch(url);
    const data = await response.json();
    let descriptionLines: string[] = [];
    if (data.description) {
      let currentLine = "";
      const descriptionWords = data.description.split(" ");
      descriptionWords.forEach((w: string) => {
        if (currentLine.length + w.length < 40) {
          currentLine += w + " ";
        } else {
          descriptionLines.push(currentLine);
          currentLine = w + " ";
        }
      })
      descriptionLines.push(currentLine);
    }
    return { descriptionLines, stars: data.stargazers_count };
  }

  const clickedCategory = (name: string, e?: any) => {
    const rootData = root?.descendants()?.find((d: any) => d.data.name === name);
    if (rootData) {
      const path = getPath(rootData)
      zoom(rootData, e);
      clickedObjectType = 'url' in rootData.data ? 'resource' : 'category'
      currentNode = {
        name,
        path,
        url: rootData.data.url || null
      }
      clickedAction = null

      if (rootData.data.url && rootData.data.url.includes("github.com")) {
        const [owner, repo] = rootData.data.url.split("github.com/")[1].split("/");
        getRepoInfo(owner, repo).then((data) => {
          currentNode = {
            ...currentNode,
            description: data.descriptionLines,
            stars: data.stars
          }
        });
      }
    }
  }

  const clickedCircle = (e: any, rootData: any) => {
    if (choosingCategoryForForm) {
      if (('children' in rootData.data)) {
        const path = getPath(rootData)
        zoom(rootData, e);
        categoryForForm = {
          name: rootData.data.name,
          path,
        }
      }
    } else {
      categoryForForm = null
      if (activeFocus !== rootData) {
        clickedCategory(rootData.data.name, e)
      } else if (!('children' in rootData.data)) {
        clickedAction = null
        e.stopPropagation()
        window.open(rootData.data.url, '_blank')
      } else {
        clickedAction = null
        currentNode = { name: tree.name, path: [tree.name], url: null }
      }
    }
  }

  const toggleChoosingCategoryForForm = (shouldCancel: boolean) => {
    choosingCategoryForForm = !choosingCategoryForForm
    if (!choosingCategoryForForm && shouldCancel) {
      categoryForForm = null
    }
  }

  const setClickAction = (action: any) => {
    clickedAction = action
  }
</script>

<svelte:window bind:innerHeight bind:innerWidth on:keydown={(event) => {
  if (event.key === 'Escape') {
    const previousIndex = currentNode.path.length === 1 ? 0 : currentNode.path.length - 2;
    clickedCategory(currentNode.path[previousIndex]);
  }
}}/>

<!-- HAMBURGER MENU -->

<div 
  on:click={() => {
    if (!isMenuOpen) {
      isMenuOpen = true;
    }
  }}
  on:keydown={() => {}}
  role="button"
  tabindex="-2"
  class="
    menu-container 
    absolute 
  bg-neutral-900
    top-4 
    left-4 
    p-4
    rounded-md
    flex 
    flex-col 
    align-start 
    justify-start
    {!isMenuOpen ? 'cursor-pointer' : 'cursor-default'}
    z-1
  "
>
  <div 
    class="hamburger flex flex-col justify-between w-6 h-[16px] min-h-[16px] z-2 {isMenuOpen ? 'cursor-pointer' : ''}" 
    class:open={isMenuOpen} 
    role="button"
    tabindex="-4"
    on:keydown={() => {}}
    on:click={(e) => {
      if (isMenuOpen) {
        e.stopPropagation();
        clickedAction = null
        isMenuOpen = false;
      }
    }}
  >
    <div class="hamburger-line top"></div>
    <div class="hamburger-line middle origin-center"></div>
    <div class="hamburger-line bottom"></div>
  </div>

  {#if isMenuOpen}
    <Menu 
      clickedObjectType={clickedObjectType}
      clickedAction={clickedAction}
      currentNode={currentNode}
      choosingCategoryForForm={choosingCategoryForForm}
      categoryForForm={categoryForForm}
      currentNodeChildrenNames={currentNodeChildrenNames}
      tree={tree}
      root={root}
      clickedCategory={clickedCategory}
      toggleChoosingCategoryForForm={toggleChoosingCategoryForForm}
      updateTree={updateTree}
      setClickAction={setClickAction}
    />
  {/if}
</div>

<!-- CIRCLE UI - adapted from https://svend3r.dev/charts/circlePack -->

{#if root}
  <svg 
    height={svgHeight}
    width={svgWidth}
    style="background: transparent;" 
    role="button"
    tabindex="0"
    on:click={(e) => {
      zoom(root, e)
      if (!choosingCategoryForForm) {
        clickedObjectType = "category"
        clickedAction = null
        currentNode = { name: tree.name, path: [tree.name], url: null }
      } else {
        categoryForForm = { name: tree.name, path: [tree.name] }
      }
    }}
    on:keydown={() => {}}
  >
    <g transform="translate({svgWidth / 2},{svgHeight / 2})">
      {#each root.descendants().slice(1) as rootData}
        <circle 
          class="
            cursor-pointer 
            hover:stroke-black 
            hover:stroke-[3px] 
            {rootData.parent 
              ? rootData.data.children
                ? '' 
                : 'fill-green-600' 
              : 'pointer-events-none'
            }
          "
          role="button"
          tabindex="-1"
          fill={rootData.data.children ? color(rootData.depth) : 'null'} 
          transform="translate({(rootData.x - activeZoomA) * activeZoomK},{(rootData.y - activeZoomB) * activeZoomK})"
          r={rootData.r * activeZoomK}
          on:click={(e) => clickedCircle(e, rootData)}
          on:keydown={() => {}}
        ></circle>
      {/each}
      {#each root.descendants() as rootDes}
        <text 
          font-size="20px"
          class="pointer-events-none stroke-white fill-white" 
          style="
            text-anchor: middle;
            fill-opacity: {
              rootDes.parent === activeFocus || (
                currentNode && 
                currentNode.name === rootDes?.data?.name &&
                !!currentNode.url
              ) ? 1 : 0}; 
            display: {
              rootDes.parent === activeFocus || (
                currentNode && 
                currentNode.name === rootDes?.data?.name &&
                !!currentNode.url
              ) ? "inline" : "none"
            };
          "
          transform="translate({(rootDes.x - activeZoomA) * activeZoomK},{(rootDes.y - activeZoomB) * activeZoomK - (currentNode.description ? 40 : 0)})"
        >
          {rootDes?.data?.name}

          {#if currentNode && currentNode.name === rootDes?.data?.name && currentNode.url}
            <tspan font-size="12px" x="0" dy="2.5em">{currentNode.url}</tspan>
          {/if}

          {#if currentNode && currentNode.name === rootDes?.data?.name && currentNode.description}
            {#each currentNode.description as line, index}
              <tspan font-size="12px" x="0" dy="{index === 0 ? '2.5em' : '1.8em'}">{line}</tspan>
            {/each}
            <tspan font-size="12px" x="0" dy="2.5em">{currentNode.stars} stars on GitHub</tspan>
          {/if}
        </text>
      {/each}
    </g>
  </svg>
{/if}

<!-- INFO MODAL -->

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<p class="
  text-lg 
  text-primary-500 
  cursor-pointer 
  font-bold 
  absolute 
  bottom-2
  left-4
" 
  on:click={() => (showInfoModal = true)}
>ⓘ</p>

<Modal bind:showModal={showInfoModal} isConfirm={false} confirmFn={() => {}}>
  <svelte:fragment slot="header">
    <h2 class="font-bold text-xl">
      Open Open Source
    </h2>

    <p class="italic my-2">The best things in code are free.</p>
  </svelte:fragment>
  
  <p>How this works:</p>
  <ul>
    <li>- Anyone can make changes.</li>
    <li>- All changes are permanent.</li>
    <li>- No more than 10 items in a category.</li>
  </ul>

	<p class="my-2">Made by <a href="https://github.com/tylerb1">tylerb1</a></p>
</Modal>

<style>
  .menu-container {
    max-width: calc(100vw - 2rem);
    max-height: calc(100vh - 2rem);
    overflow-y: scroll;
    overflow-x: none;
  }

  .hamburger-line {
    width: 100%;
    height: 2px;
    background-color: white;
    transition: transform 0.3s ease;
  }

  .hamburger.open .hamburger-line.top {
    transform: translateY(7px) rotate(45deg);
  }

  .hamburger.open .hamburger-line.middle {
    transform: scaleX(0);
  }

  .hamburger.open .hamburger-line.bottom {
    transform: translateY(-7px) rotate(-45deg);
  }
</style>
