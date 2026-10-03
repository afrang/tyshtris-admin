import Swal from 'sweetalert2'

const base = Swal.mixin({
  buttonsStyling: false,
  customClass: {
    popup: 'cc-swal-popup',
    title: 'cc-swal-title',
    htmlContainer: 'cc-swal-html',
    confirmButton: 'cc-swal-confirm',
    cancelButton: 'cc-swal-cancel',
    actions: 'cc-swal-actions',
  },
})

export async function confirmDialog(options: {
  title?: string
  text: string
  confirmText?: string
  cancelText?: string
}): Promise<boolean> {
  const result = await base.fire({
    title: options.title ?? 'Are you sure?',
    text: options.text,
    icon: 'warning',
    showCancelButton: true,
    reverseButtons: true,
    focusCancel: true,
    confirmButtonText: options.confirmText ?? 'Delete',
    cancelButtonText: options.cancelText ?? 'Cancel',
  })
  return result.isConfirmed
}

export async function alertDialog(options: {
  title?: string
  text: string
  icon?: 'success' | 'error' | 'warning' | 'info' | 'question'
}): Promise<void> {
  await base.fire({
    title: options.title ?? 'Notice',
    text: options.text,
    icon: options.icon ?? 'info',
    confirmButtonText: 'OK',
  })
}
