import useIsMobile from './useIsMobile'

function useResponsiveGrid() {
  const isMobile = useIsMobile()
  return {
    grid1: {
      display            : 'grid',
      gridTemplateColumns: '1fr',
      gap                : '12px'
    },
    grid2: {
      display            : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
      gap                : isMobile ? '12px' : '16px'
    },
    grid3: {
      display            : 'grid',
      gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
      gap                : isMobile ? '12px' : '16px'
    },
    grid4: {
      display            : 'grid',
      gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
      gap                : isMobile ? '12px' : '16px'
    }
  }
}

export default useResponsiveGrid