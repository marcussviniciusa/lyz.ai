import React, { useState, useEffect } from 'react'
import { Input } from './input'
import { Label } from './label'

interface DateInputProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

export function DateInput({ 
  id, 
  label, 
  value, 
  onChange, 
  placeholder = "DD/MM/AAAA", 
  required = false,
  className 
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState('')

  // Converter valor interno (YYYY-MM-DD) para exibição (DD/MM/YYYY)
  useEffect(() => {
    if (value && value.length === 10) {
      try {
        const [year, month, day] = value.split('-')
        if (year && month && day) {
          setDisplayValue(`${day}/${month}/${year}`)
        }
      } catch (error) {
        setDisplayValue('')
      }
    } else {
      setDisplayValue('')
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/\D/g, '') // Remove tudo que não é dígito
    
    // Aplicar máscara DD/MM/YYYY
    if (inputValue.length >= 2) {
      inputValue = inputValue.substring(0, 2) + '/' + inputValue.substring(2)
    }
    if (inputValue.length >= 5) {
      inputValue = inputValue.substring(0, 5) + '/' + inputValue.substring(5, 9)
    }
    
    setDisplayValue(inputValue)
    
    // Se a data estiver completa, converter para formato interno
    if (inputValue.length === 10) {
      const parts = inputValue.split('/')
      if (parts.length === 3) {
        const day = parts[0]
        const month = parts[1]
        const year = parts[2]
        
        // Validar se é uma data válida
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        if (date.getDate() == parseInt(day) && 
            date.getMonth() == parseInt(month) - 1 && 
            date.getFullYear() == parseInt(year)) {
          // Converter para formato YYYY-MM-DD
          const internalValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          onChange(internalValue)
        }
      }
    } else if (inputValue === '') {
      onChange('')
    }
  }

  return (
    <div className={className}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Input
        id={id}
        type="text"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        maxLength={10}
      />
    </div>
  )
} 