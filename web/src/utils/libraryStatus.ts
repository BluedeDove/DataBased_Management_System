export interface BookStatusMeta {
  label: string
  badgeClass: 'success' | 'warning' | 'danger' | 'info'
  canReserve: boolean
  reserveLabel: string
  hint: string
}

export function getBookStatusMeta(status?: string, availableQuantity = 0): BookStatusMeta {
  const normalizedStatus = status || 'normal'

  if (normalizedStatus !== 'normal') {
    switch (normalizedStatus) {
      case 'damaged':
        return {
          label: '待修复',
          badgeClass: 'warning',
          canReserve: false,
          reserveLabel: '馆藏维护中',
          hint: '当前馆藏状态异常，暂不支持预约或借出'
        }
      case 'lost':
        return {
          label: '已遗失',
          badgeClass: 'danger',
          canReserve: false,
          reserveLabel: '馆藏异常',
          hint: '当前馆藏状态异常，暂不支持预约或借出'
        }
      case 'destroyed':
        return {
          label: '已注销',
          badgeClass: 'danger',
          canReserve: false,
          reserveLabel: '馆藏已下架',
          hint: '该馆藏已下架，无法继续预约'
        }
      default:
        return {
          label: normalizedStatus,
          badgeClass: 'warning',
          canReserve: false,
          reserveLabel: '当前不可预约',
          hint: '当前馆藏状态异常，暂不支持预约或借出'
        }
    }
  }

  if (availableQuantity < 1) {
    return {
      label: '库存紧张',
      badgeClass: 'info',
      canReserve: false,
      reserveLabel: '暂无可约',
      hint: '当前没有可用副本，可先搜索其他版本或等待馆员处理'
    }
  }

  return {
    label: '可预约',
    badgeClass: 'success',
    canReserve: true,
    reserveLabel: '预约到馆',
    hint: '线上只提交预约，到馆后需在自助终端扫码取书'
  }
}
