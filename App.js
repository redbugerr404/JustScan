import React, { useState, useEffect, useRef } from 'react';
import { Text, View, Vibration, TouchableOpacity, SafeAreaView, StatusBar, Modal, StyleSheet, FlatList } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCodes, setScannedCodes] = useState([]);
  const [isScanning, setIsScanning] = useState(true);
  const [flashOn, setFlashOn] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [serverIP, setServerIP] = useState(null);
  
  const scannedSet = useRef(new Set());
  const timeoutRef = useRef(null);

  const findServer = async () => {
    for (let i = 1; i < 255; i++) {
        const testIP = `192.168.1.${i}`; 
        axios.get(`http://${testIP}:5000/`, { timeout: 100 })
          .then(() => { setServerIP(testIP); })
          .catch(() => {});
    }
  };

  useEffect(() => {
    if (!permission?.granted) requestPermission();
    findServer();
  }, [permission]);

  const handleBarCodeScanned = async ({ data }) => {
    if (!isScanning || scannedSet.current.has(data)) return;
    scannedSet.current.add(data);
    Vibration.vibrate(80);

    if (serverIP) {
      axios.post(`http://${serverIP}:5000/scan`, { code: data }).catch(() => {});
    }

    setScannedCodes(prev => [{ id: Date.now().toString(), value: data, time: new Date().toLocaleTimeString() }, ...prev]);
    setIsScanning(false);
    timeoutRef.current = setTimeout(() => setIsScanning(true), 1500);
  };

  if (!permission?.granted) return <View style={styles.center}><TouchableOpacity onPress={requestPermission} style={styles.btn}><Text style={{color:'#fff'}}>Grant Permission</Text></TouchableOpacity></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView style={StyleSheet.absoluteFillObject} enableTorch={flashOn} onBarcodeScanned={isScanning ? handleBarCodeScanned : undefined} />
      
      <View style={styles.statusBadge}>
        <View style={[styles.dot, { backgroundColor: serverIP ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>{serverIP ? `Connected` : "Searching..."}</Text>
      </View>

      <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.historyBtn}><Ionicons name="list" size={26} color="white" /></TouchableOpacity>
      
      <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.flashBtnCircle}>
        <Ionicons name={flashOn ? "flash" : "flash-off"} size={30} color={flashOn ? "#FFD700" : "white"} />
      </TouchableOpacity>

      <Modal visible={showHistory} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowHistory(false)}><Text style={styles.blue}>Close</Text></TouchableOpacity>
            <Text style={styles.title}>History</Text>
            <TouchableOpacity onPress={() => {setScannedCodes([]); scannedSet.current.clear();}}><Text style={styles.red}>Clear</Text></TouchableOpacity>
          </View>
          <FlatList data={scannedCodes} keyExtractor={item => item.id} renderItem={({ item }) => (
            <View style={styles.card}><Text style={styles.val}>{item.value}</Text><Text style={styles.time}>{item.time}</Text></View>
          )} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10 },
  statusBadge: { position: 'absolute', top: 50, left: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 10, borderRadius: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { color: 'white', fontSize: 12 },
  historyBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 30 },
  flashBtnCircle: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  modal: { flex: 1, backgroundColor: '#fff', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 'bold' },
  blue: { color: '#007AFF' }, red: { color: 'red' },
  card: { backgroundColor: '#f8f8f8', padding: 15, borderRadius: 10, marginBottom: 10 },
  val: { fontWeight: 'bold' }, time: { fontSize: 12, color: '#999' }
});