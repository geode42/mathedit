<script lang=ts>
	import {marked} from 'marked'
	import FancyCheckbox from './FancyCheckbox.svelte';

	export let name = ''
	export let description = ''
	export let value: any = false

	const localStorageValue = localStorage.getItem(`tex-patcher-${name}`)

	if (localStorageValue !== null) {
		if (typeof value == typeof false) {
			value = localStorageValue == 'true'
		} else {
			value = localStorageValue
		}
	}


	$: descriptionHTML = marked.parse(description)
</script>

<div class='tex-patcher-input'>
	<h2>{name}</h2>
	{#if typeof(value) == typeof false}
	<label>
		<div class='flex gap-2'>
			<FancyCheckbox on:input on:input={() => localStorage.setItem(`tex-patcher-${name}`, value)} bind:value={value}/>
			<div class="description">
				{@html descriptionHTML}
			</div>
		</div>
	</label>
	{:else if typeof value == typeof ''}
	<div class='flex flex-col gap-2'>
		<div class="description">
			{@html descriptionHTML}
		</div>
		<input bind:value={value} on:input on:input={e => localStorage.setItem(`tex-patcher-${name}`, e.target.value)} type="text">
	</div>
	{/if}
</div>

<style lang=scss>
	label {
		cursor: pointer;
	}

	:global(.tex-patcher-input h2) {
		font-weight: 600;
		font-size: 1.2rem;
	}

	:global(.tex-patcher-input input) {
		font-family: 'JetBrains Mono';
		background: var(--inactive);
		padding: 0.3rem;
		border-radius: 0.35rem;
		font-size: 0.95rem;
		transition: all 50ms;
		outline: 0 solid var(--accent);

		&:focus {
			outline: 3px solid var(--accent)
		}
	}

	:global(.tex-patcher-input .description) {
		display: inline;
		font-size: 0.9rem
	}

	:global(.tex-patcher-input .description code) {
		font-family: 'JetBrains Mono';
		background: var(--inactive);
		padding: 0.15rem 0.35rem;
		border-radius: 0.35rem;
		font-size: 0.95em;
	}
</style>