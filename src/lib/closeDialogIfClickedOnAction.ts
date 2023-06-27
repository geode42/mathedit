export function closeDialogIfClickedOn(node: HTMLDialogElement) {
	node.addEventListener('mousedown', e => {
		if (e.buttons == 1 && e.target == node) {
			node.close()
		}
	})
}