import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Stage, Layer, Circle, Line, Text } from 'react-konva';
import { Button } from 'semantic-ui-react'

const COMMANDS = {idle: "IDLE", delete: "DELETE"};

function createNode(id, x, y){
  return {id: id.toString(), x, y, inputLink: null, outputLinks: []};
}

function createLink(node1, node2){  
  const linkId = node1.id + '-' + node2.id;
  node1.outputLinks.push(linkId);
  node2.inputLink = linkId;
  return {id: linkId, node1, node2};
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

const INITIAL_TREE = generateTree();
const App = () => {
  const [currentCommand, setCurrentCommand] = useState(COMMANDS.idle);
  const [clickId, setClickId] = useState("none");
  const [hoverId, setHoverId] = useState("none");
  const [nodes, setNodes] = useState(INITIAL_TREE.nodes);
  const [links, setLinks] = useState(INITIAL_TREE.links);

  const TRANSLATE_X = 100;
  const TRANSLATE_Y = 100;
  const SCALE = 40;

  function deleteFloatingNodes(links, nodes){
    nodes.forEach((node) => {
      if(node.inputLink == null && node.outputLinks.length == 0){
        nodes.delete(node.id);
      }
    });
    return [links, nodes];
  }

  function simplifyNonBranchingNodes(links, nodes){
    nodes.forEach((node) => {
      if(node.inputLink != null && node.outputLinks.length == 1){
        const inputLink = links.get(node.inputLink);
        const outputLink = links.get(node.outputLinks[0]);
        
        const newLink = createLink(inputLink.node1, outputLink.node2);
        // Delete node1's reference to simplified link
        inputLink.node1.outputLinks.filter((outputLink) => outputLink != node.id);    
        // Delete node2's reference to simplified link
        outputLink.node2.inputLink = null;
        
        links.set(newLink.id, newLink);
        links.delete(inputLink.id);
        links.delete(outputLink.id);
        nodes.delete(node.id);
        
      }
    });
    return [links, nodes];
  }

  function deleteLink(linkId, links, nodes){
    [links, nodes] = pruneLinkBranch(linkId, links, nodes);
    [links, nodes] = deleteFloatingNodes(links, nodes);
    [links, nodes] = simplifyNonBranchingNodes(links, nodes);    
    //[links, nodes] = deleteFloatingNodes(links, nodes);
    return [links, nodes];
  }

  function pruneLinkBranch(linkId, links, nodes){
    let [newLinks, newNodes] = [links, nodes];

    const link = links.get(linkId);
    if(link){
      // Delete all children    
      link.node2.outputLinks.forEach((childLinkId) => { [newLinks, newNodes] = deleteLink(childLinkId, newLinks, newNodes) });    
      link.node2.inputLink = null;

      // Delete link
      newLinks.delete(linkId);


      if(link.node1){
        // Delete link from node1's outputLinks
        link.node1.outputLinks = link.node1.outputLinks.filter((outputLink) => outputLink != linkId);

        if(link.node1.outputLinks.length == 0){
          // Delete node1's input link
          link.node1.inputLink = null;
          [newLinks, newNodes] = deleteLink(link.node1.inputLink, newLinks, newNodes);
        }

      }
    }

        
    return [newLinks, newNodes];
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
                    points={[link.node1.x*SCALE + TRANSLATE_X, link.node1.y*SCALE + TRANSLATE_Y,      
                             link.node2.x*SCALE + TRANSLATE_X, link.node2.y*SCALE + TRANSLATE_Y]} stroke="transparent" strokeWidth={25} />
              <Line id={link.id} key={link.id}                    
                    onClick={() => {setClickId(link.id)}}
                    onMouseOver={() => {setHoverId(link.id)}}
                    points={[link.node1.x*SCALE + TRANSLATE_X, link.node1.y*SCALE + TRANSLATE_Y,      
                             link.node2.x*SCALE + TRANSLATE_X, link.node2.y*SCALE + TRANSLATE_Y]} stroke={hoverId == link.id ? "blue" : "black"} strokeWidth={5} />
             </>
    } else {

      return <>
              <Line id={link.id+'biggerarea'} key={link.id+'biggerarea'}
                   onClick={() => {setClickId(link.id)}}
                   onMouseEnter={() => {setHoverId(link.id)}}
                   onMouseLeave={() => {setHoverId("none")}}
                   bezier
                   points={[link.node1.x*SCALE + TRANSLATE_X, link.node1.y*SCALE + TRANSLATE_Y,
                          (link.node1.x+0.5)*SCALE + TRANSLATE_X, 0.5*(link.node2.y + link.node1.y)*SCALE + TRANSLATE_Y,
                          (link.node1.x+1)*SCALE + TRANSLATE_X, (link.node2.y)*SCALE + TRANSLATE_Y,
                          link.node2.x*SCALE + TRANSLATE_X, link.node2.y*SCALE + TRANSLATE_Y]} stroke="transparent" strokeWidth={25} />
              <Line id={link.id} key={link.id}
                   onClick={() => {setClickId(link.id)}}
                   bezier
                   points={[link.node1.x*SCALE + TRANSLATE_X, link.node1.y*SCALE + TRANSLATE_Y,
                          (link.node1.x+0.5)*SCALE + TRANSLATE_X, 0.5*(link.node2.y + link.node1.y)*SCALE + TRANSLATE_Y,
                          (link.node1.x+1)*SCALE + TRANSLATE_X, (link.node2.y)*SCALE + TRANSLATE_Y,
                          link.node2.x*SCALE + TRANSLATE_X, link.node2.y*SCALE + TRANSLATE_Y]} stroke={hoverId == link.id ? "blue" : "black"} strokeWidth={5} />                          
              </>                           
    }
  }
  return (
    <>
    <Button onClick={() => {currentCommand == COMMANDS.delete ? setCurrentCommand(COMMANDS.idle) : setCurrentCommand(COMMANDS.delete)}} >Delete</Button>
    <h3>{currentCommand}</h3>
    <Stage width={window.innerWidth} height={window.innerHeight}>
      <Layer>                  
          {Array.from(links).map(([key, value]) => value).map((link) => (
            getLine(link)
          ))}

          {Array.from(nodes).map(([key, value]) => value).map((node) => (
            <>
            
            <Circle id={node.id} key={node.id}
                    stroke="black" radius={10} fill="red" 
                    x={node.x*SCALE + TRANSLATE_X} y={node.y*SCALE + TRANSLATE_Y} />
            <Text fill="magenta" id={node.id+'text'} key={node.id+'text'} text={`${node.id}\n${node.inputLink}\n${node.outputLinks}`} x={node.x*SCALE + TRANSLATE_X + 10} y={node.y*SCALE + TRANSLATE_Y + 10} />
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
