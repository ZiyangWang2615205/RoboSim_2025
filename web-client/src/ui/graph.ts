import Chart from 'chart.js/auto';

export function createGraph(
    canvas: HTMLCanvasElement, 
    graphtitle: string, 
    xlabels: string[], 
    xtitle: string, 
    ytitle: string, 
    datasets: {label: string; data: any; borderWidth: number}[],
    displayLegend: boolean
): Chart{
     return new Chart(canvas, {
        type: 'bar',
        data: {
          labels: xlabels,
          datasets: datasets,
        },
        options: {
          scales: {
            y: {
              title: {
                display: true,
                align: 'center',
                text: ytitle,
                color: '#FFFFFF',
                font: {
                  family: 'Oxanium',
                  size: 14,
                  weight: 'bold'
                }
              },
              beginAtZero: true,
              ticks: {
                color: '#FFFFFF',
                font: {
                  family: 'Oxanium',
                  size: 12,
                }
              }
            },
            x: {
              title: {
                display: true,
                align: 'center',
                text: xtitle,
                color: '#FFFFFF',
                font: {
                  family: 'Oxanium',
                  size: 15,
                  weight: 'bold'
                }
              },
              ticks: {
                color: '#FFFFFF',
                font: {
                  family: 'Oxanium',
                  size: 12,
                }
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: graphtitle,
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 18,
                weight: 'bold'
              }
            },
            legend: {
              display: displayLegend,
              labels: {
                color: '#FFFFFF',
                font: {
                  family: 'Oxanium',
                  size: 12,
                }
              }
            }
          },
          layout: {
            padding: 30
          }
        }
    });
}

export function createGraph2Ys(
  canvas: HTMLCanvasElement, 
  graphtitle: string, 
  xlabels: string[], 
  xtitle: string, 
  ytitle1: string, 
  ytitle2: string,
  ytitle3: string, // energy used
  datasets: {label: string; yAxisID: string, data: any; borderWidth: number}[],
  displayLegend: boolean
): Chart{
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: xlabels,
        datasets: datasets,
      },
      options: {
        scales: {
          y1: {
            title: {
              display: true,
              align: 'center',
              text: ytitle1,
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 14,
                weight: 'bold'
              }
            },
            position: 'left',
            beginAtZero: true,
            ticks: {
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 12,
              }
            }
          },
          y2: {
            title: {
              display: true,
              align: 'center',
              text: ytitle2,
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 14,
                weight: 'bold'
              }
            },
            position: 'right',
            beginAtZero: true,
            ticks: {
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 12,
              }
            }
          },
          y3: { // energy used
            title: {
              display: true,
              align: 'center',
              text: ytitle3,
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 14,
                weight: 'bold'
              }
            },
            position: 'left',
            beginAtZero: true,
            ticks: {
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 12,
              }
            }
          },
          x: {
            title: {
              display: true,
              align: 'center',
              text: xtitle,
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 15,
                weight: 'bold'
              }
            },
            ticks: {
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 12,
              }
            }
          }
        },
        plugins: {
          title: {
            display: true,
            text: graphtitle,
            color: '#FFFFFF',
            font: {
              family: 'Oxanium',
              size: 18,
              weight: 'bold'
            }
          },
          legend: {
            display: displayLegend,
            labels: {
              color: '#FFFFFF',
              font: {
                family: 'Oxanium',
                size: 12,
              }
            }
          }
        },
        layout: {
          padding: 30
        }
      }
  });
}