import * as d3 from 'd3'
import type { Ref } from 'vue'

export interface MindMapNode {
  id: string
  type: 'entry' | 'author' | 'tag' | 'topic'
  label: string
  metadata: Record<string, any>
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

export interface MindMapEdge {
  source: string | MindMapNode
  target: string | MindMapNode
  type: string
  weight: number
}

export interface MindMapOptions {
  width?: number
  height?: number
  nodeRadius?: number
  linkDistance?: number
  chargeStrength?: number
  onNodeClick?: (node: MindMapNode) => void
  onNodeHover?: (node: MindMapNode | null) => void
}

export function useMindMap(containerRef: Ref<HTMLElement | null>, options: MindMapOptions = {}) {
  const {
    width = 800,
    height = 600,
    nodeRadius = 8,
    linkDistance = 100,
    chargeStrength = -300,
    onNodeClick,
    onNodeHover,
  } = options

  let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null
  let simulation: d3.Simulation<MindMapNode, MindMapEdge> | null = null
  let zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null

  const nodes = ref<MindMapNode[]>([])
  const edges = ref<MindMapEdge[]>([])
  const selectedNode = ref<MindMapNode | null>(null)
  const hoveredNode = ref<MindMapNode | null>(null)

  const nodeColors: Record<string, string> = {
    entry: '#6366f1',
    author: '#10b981',
    tag: '#f59e0b',
    topic: '#ec4899',
  }

  function init() {
    if (!containerRef.value) return

    d3.select(containerRef.value).selectAll('*').remove()

    svg = d3
      .select(containerRef.value)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')

    const defs = svg.append('defs')

    defs
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8')

    const g = svg.append('g').attr('class', 'graph-container')

    g.append('g').attr('class', 'links')
    g.append('g').attr('class', 'nodes')
    g.append('g').attr('class', 'labels')

    zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
      })

    svg.call(zoom)

    simulation = d3
      .forceSimulation<MindMapNode>()
      .force(
        'link',
        d3
          .forceLink<MindMapNode, MindMapEdge>()
          .id((d) => d.id)
          .distance((d) => linkDistance / (d.weight || 1)),
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(nodeRadius * 2))
  }

  function update(newNodes: MindMapNode[], newEdges: MindMapEdge[]) {
    if (!svg || !simulation) return

    nodes.value = newNodes.map((n) => ({ ...n }))
    edges.value = newEdges.map((e) => ({ ...e }))

    const g = svg.select('.graph-container')

    const link = g
      .select('.links')
      .selectAll<SVGLineElement, MindMapEdge>('line')
      .data(edges.value, (d: any) => `${d.source.id || d.source}-${d.target.id || d.target}`)

    link.exit().remove()

    const linkEnter = link
      .enter()
      .append('line')
      .attr('stroke', (d) => getEdgeColor(d.type))
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d) => Math.sqrt(d.weight) * 2)

    const linkMerge = linkEnter.merge(link as any)

    const node = g
      .select('.nodes')
      .selectAll<SVGCircleElement, MindMapNode>('circle')
      .data(nodes.value, (d: MindMapNode) => d.id)

    node.exit().remove()

    const nodeEnter = node
      .enter()
      .append('circle')
      .attr('r', (d) => getNodeRadius(d))
      .attr('fill', (d) => nodeColors[d.type] || '#6366f1')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .call(drag(simulation) as any)

    nodeEnter
      .on('click', (event, d) => {
        event.stopPropagation()
        selectedNode.value = d
        onNodeClick?.(d)
      })
      .on('mouseenter', (event, d) => {
        hoveredNode.value = d
        onNodeHover?.(d)
        d3.select(event.currentTarget).attr('stroke', '#000').attr('stroke-width', 3)
      })
      .on('mouseleave', (event) => {
        hoveredNode.value = null
        onNodeHover?.(null)
        d3.select(event.currentTarget).attr('stroke', '#fff').attr('stroke-width', 2)
      })

    nodeEnter.append('title').text((d) => d.label)

    const nodeMerge = nodeEnter.merge(node as any)

    const label = g
      .select('.labels')
      .selectAll<SVGTextElement, MindMapNode>('text')
      .data(
        nodes.value.filter((n) => n.type === 'entry'),
        (d: MindMapNode) => d.id,
      )

    label.exit().remove()

    const labelEnter = label
      .enter()
      .append('text')
      .attr('font-size', '10px')
      .attr('fill', '#374151')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => getNodeRadius(d) + 12)
      .text((d) => (d.label.length > 20 ? d.label.slice(0, 17) + '...' : d.label))

    const labelMerge = labelEnter.merge(label as any)

    simulation.nodes(nodes.value)
    ;(simulation.force('link') as d3.ForceLink<MindMapNode, MindMapEdge>).links(edges.value)

    simulation.alpha(1).restart()

    simulation.on('tick', () => {
      linkMerge
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      nodeMerge.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y)

      labelMerge.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y)
    })
  }

  function getNodeRadius(node: MindMapNode): number {
    if (node.type === 'entry') {
      const annotationCount = node.metadata?.annotationCount || 0
      return nodeRadius + Math.min(annotationCount * 2, 10)
    }
    if (node.type === 'author') return nodeRadius * 0.8
    if (node.type === 'tag') return nodeRadius * 0.7
    return nodeRadius
  }

  function getEdgeColor(type: string): string {
    const colors: Record<string, string> = {
      authored_by: '#10b981',
      has_tag: '#f59e0b',
      cites: '#6366f1',
      same_author: '#a855f7',
      similar_to: '#94a3b8',
    }
    return colors[type] || '#94a3b8'
  }

  function drag(sim: d3.Simulation<MindMapNode, MindMapEdge>) {
    function dragstarted(event: d3.D3DragEvent<SVGCircleElement, MindMapNode, MindMapNode>) {
      if (!event.active) sim.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: d3.D3DragEvent<SVGCircleElement, MindMapNode, MindMapNode>) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: d3.D3DragEvent<SVGCircleElement, MindMapNode, MindMapNode>) {
      if (!event.active) sim.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return d3
      .drag<SVGCircleElement, MindMapNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
  }

  function zoomToFit() {
    if (!svg || nodes.value.length === 0) return

    const padding = 50
    const bounds = {
      minX: d3.min(nodes.value, (d) => d.x || 0) || 0,
      maxX: d3.max(nodes.value, (d) => d.x || 0) || width,
      minY: d3.min(nodes.value, (d) => d.y || 0) || 0,
      maxY: d3.max(nodes.value, (d) => d.y || 0) || height,
    }

    const graphWidth = bounds.maxX - bounds.minX + padding * 2
    const graphHeight = bounds.maxY - bounds.minY + padding * 2

    const scale = Math.min(width / graphWidth, height / graphHeight, 1)
    const translateX = (width - graphWidth * scale) / 2 - bounds.minX * scale + padding * scale
    const translateY = (height - graphHeight * scale) / 2 - bounds.minY * scale + padding * scale

    svg
      .transition()
      .duration(750)
      .call(zoom!.transform as any, d3.zoomIdentity.translate(translateX, translateY).scale(scale))
  }

  function exportSVG(): string {
    if (!svg) return ''

    const svgNode = svg.node()
    if (!svgNode) return ''

    const serializer = new XMLSerializer()
    let svgString = serializer.serializeToString(svgNode)

    svgString = '<?xml version="1.0" standalone="no"?>\n' + svgString

    return svgString
  }

  function destroy() {
    if (simulation) {
      simulation.stop()
      simulation = null
    }
    if (containerRef.value) {
      d3.select(containerRef.value).selectAll('*').remove()
    }
    svg = null
  }

  onMounted(() => {
    init()
  })

  onUnmounted(() => {
    destroy()
  })

  return {
    nodes,
    edges,
    selectedNode,
    hoveredNode,
    init,
    update,
    zoomToFit,
    exportSVG,
    destroy,
  }
}
