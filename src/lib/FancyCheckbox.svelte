<script lang=ts>
	import { onMount } from "svelte"

	export let value = false

	const SVGNamespace = 'http://www.w3.org/2000/svg'

	let button: HTMLButtonElement
	onMount(() => {
		const checkMarkSVG = document.createElementNS(SVGNamespace, 'svg')
		checkMarkSVG.setAttribute('viewBox', '0 0 100 100')
		// checkMarkSVG.setAttribute('width', '100%')
		// checkMarkSVG.setAttribute('height', '100%')
		const checkMarkPath = document.createElementNS(SVGNamespace, 'path')
		checkMarkPath.setAttribute('d', 'M 10 50 L 42 80 L 90 18')
		checkMarkPath.setAttribute('stroke', 'white')
		checkMarkPath.setAttribute('stroke-width', '14px')
		checkMarkPath.setAttribute('fill', 'none')
		// checkMarkPath.setAttribute('stroke-linejoin', 'round')
		// checkMarkPath.setAttribute('stroke-linecap', 'round')
		checkMarkSVG.append(checkMarkPath)

		button.append(checkMarkSVG)

	})


</script>

<button
	bind:this={button}
	class='checkbox {value?'checked':''}'
	on:click={()=>{value=!value; button.dispatchEvent(new Event('input', { bubbles: true }))}}
	on:input
	role=checkbox
	aria-checked={value}
	tabindex=0
>
</button>

<style lang=scss>
	.checkbox {
		width: 1.4em;
		height: 1.4em;
		border: none;
		background-color: var(--inactive);
		display: grid;
		place-items: center;
		padding: 0;
		transition: all 100ms;
		border-radius: 0.4rem;

		// &:hover {
		// 	background-color: ;
		// }
		
		&.checked {
			background-color: var(--accent);
		}
	}

	:global(.checkbox:not(.checked) > svg) {
		opacity: 0;
	}

	:global(.checkbox > svg) {
		width: 78%;
		height: 78%;
		transition: all 100ms
	}
</style>