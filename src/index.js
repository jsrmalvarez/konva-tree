import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage, Layer, Circle, Line, Text } from 'react-konva';
import { Button, Popup } from 'semantic-ui-react'

const COMMANDS = {idle: "IDLE", delete: "DELETE"};

const TRANSLATE_X = 100;
const TRANSLATE_Y = 100;
const SCALE_X = 10;
const SCALE_Y = 40;

function createNode(id, x, y, balance, instantInfo){
  return {id: id.toString(), x, y, balance, instantInfo, inputLink: null, outputLinks: []};
}

function createLink(node1, node2){  
  const linkId = node1.id + '-' + node2.id;
  node1.outputLinks.push(linkId);
  node2.inputLink = linkId;
  return {id: linkId, node1, node2};
}

function generateTreeFromFile(jsonData) {

  const simulation_data = require('./output.json');
  const timelines = simulation_data.timelines;
  const nodes = new Map(); // To track nodes and avoid duplicates
  const links = new Map();
  const endNodes = new Map(); // Tracks end nodes of each timeline

  timelines.forEach((timeline, index) => {
    const keys = Object.keys(timeline).map(Number).sort((a, b) => a - b);
    const firstInstant = keys[0];
    const lastInstant = keys[keys.length - 1];
    let firstNode = null;    
    

    // Create nodes and links for the rest of the timeline
    for (let i = 0; i < keys.length; i++) {

      const instant = keys[i];

      let totalBalance = 0
      let modelData = {};
      let instantInfo = simulation_data.timelines[index][instant]      
      for(let modelId in instantInfo){
        let model = instantInfo[modelId];
        for(let property in model){            
          modelData = model[property];
          for(let property in modelData){
            if(property === "balance"){            
              totalBalance = totalBalance +  modelData.balance;
            }
          }
          
        }                
      }

      
      const nodeName = `${instant}_${index}`;
      if(instant == firstInstant){
        if(endNodes.has(firstInstant - 1)){
          firstNode = endNodes.get(firstInstant - 1);
        }
        else{
          firstNode = createNode(nodeName, firstInstant, index, totalBalance, instantInfo);
          nodes.set(firstNode.id, firstNode);          
        }
      }

      if(instant == lastInstant){
        const lastNode = createNode(nodeName, lastInstant, index, totalBalance, instantInfo);      
                
        
        endNodes.set(lastInstant, lastNode);
        nodes.set(lastNode.id, lastNode);
        const newLink = createLink(firstNode, lastNode);
        links.set(newLink.id, newLink);
      }
    }
  });

  return {nodes, links};
}

function generateTree(){
  const nodes = new Map();
  const node0_0 = createNode("0_0", 0, 0);
  const node7_0 = createNode("7_0", 7, 0);
  const node17_0 = createNode("17_0", 17, 0);
  const node25_0 = createNode("25_0", 25, 2);
  const node30_0 = createNode("30_0", 30, 0);
  const node30_1 = createNode("30_1", 30, 1);
  const node30_2 = createNode("30_2", 30, 2);
  const node30_3 = createNode("30_3", 30, 3);
  const node30_4 = createNode("30_4", 30, 4);

  nodes.set(node0_0.id, node0_0);
  nodes.set(node7_0.id, node7_0);
  nodes.set(node17_0.id, node17_0);
  nodes.set(node25_0.id, node25_0);
  nodes.set(node30_0.id, node30_0);
  nodes.set(node30_1.id, node30_1);
  nodes.set(node30_2.id, node30_2);
  nodes.set(node30_3.id, node30_3);
  nodes.set(node30_4.id, node30_4);
  
  const links = new Map();
  const link0 = createLink(node0_0, node7_0);
  const link1 = createLink(node7_0, node17_0);
  const link2 = createLink(node7_0, node25_0);
  const link3 = createLink(node17_0, node30_0);
  const link4 = createLink(node17_0, node30_1);
  const link6 = createLink(node25_0, node30_2);
  const link7 = createLink(node25_0, node30_3);
  const link8 = createLink(node25_0, node30_4);
  
  links.set(link0.id, link0);
  links.set(link1.id, link1);
  links.set(link2.id, link2);
  links.set(link3.id, link3);
  links.set(link4.id, link4);
  links.set(link6.id, link6);
  links.set(link7.id, link7);
  links.set(link8.id, link8);
  
  return {nodes, links};

}


const App = () => {
  const [currentCommand, setCurrentCommand] = useState(COMMANDS.idle);
  const [clickId, setClickId] = useState("none");
  const [hoverId, setHoverId] = useState("none");
  
  const INITIAL_TREE = generateTreeFromFile();
  const [nodes, setNodes] = useState(INITIAL_TREE.nodes);
  const [links, setLinks] = useState(INITIAL_TREE.links);

  const root = getRootNode(links, nodes);

  const [stage, setStage] = useState({
    scale: 1,
    x: 0,
    y: 0
  });

  const handleWheel = (e) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
      y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    setStage({
      scale: newScale,
      x: (stage.getPointerPosition().x / newScale - mousePointTo.x) * newScale,
      y: (stage.getPointerPosition().y / newScale - mousePointTo.y) * newScale
    });
  };


  performPositioning(root, links, nodes);

  function simplifyNonBranchingNodes(links, nodes){
    while(true){
      let nonBranchingNodes = [];
      nodes.forEach((node) => {
        if(node.inputLink != null && node.outputLinks.length == 1){
          nonBranchingNodes.push(node);
        }
      });

      if(nonBranchingNodes.length == 0){
        break;
      }
      
      nonBranchingNodes.forEach((nonBranchingNode) => {
        const newLinkOrigin = links.get(nonBranchingNode.inputLink).node1;
        const newLinkDestination = links.get(nonBranchingNode.outputLinks[0]).node2;
        
        // Delete reference to old link from newLinkOrigin
        newLinkOrigin.outputLinks = newLinkOrigin.outputLinks.filter((outputLink) => outputLink != nonBranchingNode.inputLink);
        // Create new link (this will add references to the new link to both origin and destination nodes)
        const newLink = createLink(newLinkOrigin, newLinkDestination);
        links.set(newLink.id, newLink);

        // Remove nonBranching node and old links from the map
        links.delete(nonBranchingNode.inputLink);
        links.delete(nonBranchingNode.outputLinks[0]);
        nodes.delete(nonBranchingNode.id);
      });

    }

    return [links, nodes];
  }

  function getRootNode(links, nodes){
    for(let node of nodes.values()){
      if(node.inputLink == null){
        return node;
      }
    }    
    return null;
  }
  
  function performPositioning(originNode, links, nodes){
    const childrenNodes = originNode.outputLinks.map((outputLink) => links.get(outputLink).node2);

    if(childrenNodes.length > 0){
      childrenNodes.sort((a, b) => a.y - b.y);    
      
      let diffY = childrenNodes[0].y - originNode.y;      
      childrenNodes.forEach((childNode) => {        
        childNode.y = childNode.y - diffY;
        performPositioning(childNode, links, nodes);        
      });
    }
  }

  function deleteLink(linkId, links, nodes){
    [links, nodes] = pruneLinkBranch(linkId, links, nodes);
    //[links, nodes] = simplifyNonBranchingNodes(links, nodes);    
    const root = getRootNode(links, nodes);
    performPositioning(root, links, nodes);    
    return [links, nodes];
  }

  function pruneLinkBranch(linkId, links, nodes){

    const link = links.get(linkId);
    if(link){      

      // Delete node2 from nodes map
      nodes.delete(link.node2.id);                

      // Delete link reference from node1's outputLinks
      if(link.node1){
        link.node1.outputLinks = link.node1.outputLinks.filter((outputLink) => outputLink != linkId);        
      }

      // Delete link from links map
      links.delete(linkId);

      // Delete all children (iterative way instead of recursive)
      while(true){
        let orphanLinks = [];
        links.forEach((link) => {
          if(nodes.get(link.node1.id) == null){
            orphanLinks.push(link.id);
          }
        });

        if(orphanLinks.length == 0){
          // No more orphan links
          break;
        } else {
          orphanLinks.forEach((linkId) => {
            const link = links.get(linkId);
            nodes.delete(link.node2.id);
            links.delete(linkId);
          })
        }

      }
    }

        
    return [links, nodes];
  }

  useEffect(() => {
    if(currentCommand == COMMANDS.delete){
      if(clickId != "none"){
        const [newLinks, newNodes] = deleteLink(clickId, links, nodes);        
        setLinks(new Map(newLinks));
        setNodes(new Map(newNodes));
        setClickId("none");        
      }
    }
    else{
      setClickId("none");
    }
  }, [clickId]);

  function getLine(link){
    if(link.node1.y == link.node2.y){
      return <>
              <Line id={link.id+'biggerarea'} key={link.id+'biggerarea'}
                    onClick={() => {setClickId(link.id)}}
                    onMouseEnter={() => {setHoverId(link.id)}}
                    onMouseLeave={() => {setHoverId("none")}}
                    points={[link.node1.x*SCALE_X + TRANSLATE_X, link.node1.y*SCALE_Y + TRANSLATE_Y,      
                             link.node2.x*SCALE_X + TRANSLATE_X, link.node2.y*SCALE_Y + TRANSLATE_Y]} stroke="transparent" strokeWidth={25} />
              <Line id={link.id} key={link.id}                    
                    onClick={() => {setClickId(link.id)}}
                    onMouseOver={() => {setHoverId(link.id)}}
                    points={[link.node1.x*SCALE_X + TRANSLATE_X, link.node1.y*SCALE_Y + TRANSLATE_Y,      
                             link.node2.x*SCALE_X + TRANSLATE_X, link.node2.y*SCALE_Y + TRANSLATE_Y]} stroke={hoverId == link.id ? "cornflowerblue" : "darkslategrey"} strokeWidth={2} />
             </>
    } else {

      return <>
              <Line id={link.id+'biggerarea'} key={link.id+'biggerarea'}
                   onClick={() => {setClickId(link.id)}}
                   onMouseEnter={() => {setHoverId(link.id)}}
                   onMouseLeave={() => {setHoverId("none")}}
                   bezier
                   points={[link.node1.x*SCALE_X + TRANSLATE_X, link.node1.y*SCALE_Y + TRANSLATE_Y,
                          (link.node1.x+0.5)*SCALE_X + TRANSLATE_X, 0.5*(link.node2.y + link.node1.y)*SCALE_Y + TRANSLATE_Y,
                          (link.node1.x+1)*SCALE_X + TRANSLATE_X, (link.node2.y)*SCALE_Y + TRANSLATE_Y,
                          link.node2.x*SCALE_X + TRANSLATE_X, link.node2.y*SCALE_Y + TRANSLATE_Y]} stroke="transparent" strokeWidth={25} />
              <Line id={link.id} key={link.id}
                   onClick={() => {setClickId(link.id)}}
                   bezier
                   points={[link.node1.x*SCALE_X + TRANSLATE_X, link.node1.y*SCALE_Y + TRANSLATE_Y,
                          (link.node1.x+0.5)*SCALE_X + TRANSLATE_X, 0.5*(link.node2.y + link.node1.y)*SCALE_Y + TRANSLATE_Y,
                          (link.node1.x+1)*SCALE_X + TRANSLATE_X, (link.node2.y)*SCALE_Y + TRANSLATE_Y,
                          link.node2.x*SCALE_X + TRANSLATE_X, link.node2.y*SCALE_Y + TRANSLATE_Y]} stroke={hoverId == link.id ? "cornflowerblue" : "darkslategrey"} strokeWidth={2} />                          
              </>                           
    }
  }
  return (
    <>
    <Button onClick={() => {currentCommand == COMMANDS.delete ? setCurrentCommand(COMMANDS.idle) : setCurrentCommand(COMMANDS.delete)}} >Delete</Button>
    <h3>{currentCommand}</h3>
           
    {/* <p style={{width:"50%"}}>{JSON.stringify(Array.from(nodes), null, "\t") + 'A'}</p> 
    <p style={{float:"right"}}>{JSON.stringify(Array.from(links), null, "\t") + 'B'}</p>*/}
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      draggable
      onWheel={handleWheel}
      scaleX={stage.scale}
      scaleY={stage.scale}
      x={stage.x}
      y={stage.y}
      >

      <Layer>
        {[...Array(68).keys()].map((_, n) => (
          <Line points={[n*SCALE_X + TRANSLATE_X + 2/2 + 8/2 + 4/2 + 3, 0*SCALE_Y + TRANSLATE_Y-100, n*SCALE_X + TRANSLATE_X + 2/2 + 8/2 + 4/2 +3, 500*SCALE_Y + TRANSLATE_Y]} stroke="lightgrey" strokeWidth={2}/>
        ))}        
        
      </Layer>

      <Layer>                  
          {Array.from(links).map(([key, value]) => value).map((link) => (
            getLine(link)
          ))}

          {Array.from(nodes).map(([key, value]) => value).map((node) => (
            <>
              
              <Text text={node.id} x={node.x*SCALE_X + 10 + TRANSLATE_X} y={node.y*SCALE_Y + TRANSLATE_Y} />
              <Text text={node.balance.toFixed(2)} x={node.x*SCALE_X + 10 + TRANSLATE_X} y={node.y*SCALE_Y + TRANSLATE_Y + 20} />
              <Text text={JSON.stringify(node.instantInfo, null, "  ")} x={node.x*SCALE_X + 40 + TRANSLATE_X} y={node.y*SCALE_Y + TRANSLATE_Y + 50} />
              <Circle id={node.id} key={node.id}
                      stroke="gray" strokeWidth={2} radius={6} fill="indianred" 
                      x={node.x*SCALE_X + TRANSLATE_X} y={node.y*SCALE_Y + TRANSLATE_Y} />
            </>
          ))}

      </Layer>
    </Stage>
    </>
  );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
