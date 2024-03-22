<script lang="ts">
	export let showModal: boolean;
  export let isConfirm: boolean;
  export let confirmFn: () => void;

	let dialog: HTMLDialogElement;

	$: if (dialog && showModal) dialog.showModal();
</script>

<!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
<dialog
	style="border-radius: 8px;"
	bind:this={dialog}
	on:close={() => (showModal = false)}
	on:click|self={() => dialog.close()}
>
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div on:click|stopPropagation class="bg-green-950 text-start">
		<slot name="header" />

    {#if !isConfirm}
		  <hr class="my-2" />
    {/if}

		<slot />

    {#if !isConfirm}
		  <hr class="my-2" />
    {/if}
		
    <div class="flex flex-row gap-2">
      {#if isConfirm}
        <button 
          class="bg-green-800 w-36 px-2"
          on:click={() => {
            confirmFn()
            dialog.close()
          }}
        >
          Confirm
        </button>
      {/if}
      <button class="bg-green-900" on:click={() => dialog.close()}>{isConfirm ? 'Cancel' : 'Close'}</button>
    </div>
	</div>
</dialog>

<style>
	dialog {
		max-width: 32em;
		border-radius: 0.2em;
		border: none;
		padding: 0;
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.3);
	}
	dialog > div {
		padding: 1em;
	}
	dialog[open] {
		animation: zoom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}
	@keyframes zoom {
		from {
			transform: scale(0.95);
		}
		to {
			transform: scale(1);
		}
	}
	dialog[open]::backdrop {
		animation: fade 0.2s ease-out;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	button {
		display: block;
	}
</style>
