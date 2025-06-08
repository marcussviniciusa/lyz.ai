export const formatDateBR = (date: string | Date | undefined | null): string => {
  if (!date) return 'Data não informada'
  
  try {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch (error) {
    return 'Data inválida'
  }
}

export const formatDateTimeBR = (date: string | Date | undefined | null): string => {
  if (!date) return 'Data não informada'
  
  try {
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return 'Data inválida'
  }
}

export const calculateAge = (birthDate: string | Date | undefined | null): number => {
  if (!birthDate) return 0
  
  try {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  } catch (error) {
    return 0
  }
}

export const calculateDaysSince = (date: string | Date | undefined | null): number => {
  if (!date) return 0
  
  try {
    const targetDate = new Date(date)
    const today = new Date()
    const diffTime = today.getTime() - targetDate.getTime()
    return Math.floor(diffTime / (1000 * 60 * 60 * 24))
  } catch (error) {
    return 0
  }
} 