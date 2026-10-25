export interface StateLocation {
  state: string;
  districts: string[];
  cities: string[];
}

export const STATES_LOCATIONS: StateLocation[] = [
  {
    state: 'Andaman & Nicobar Islands',
    districts: ['Nicobars', 'North & Middle Andaman', 'South Andaman'],
    cities: ['Nicobars', 'North & Middle Andaman', 'Port Blair', 'South Andaman'],
  },
  {
    state: 'Andhra Pradesh',
    districts: ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Prakasam', 'Sri Potti Sriramulu Nellore', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'Y S R'],
    cities: ['Adoni', 'Amalapuram', 'Anakapalle', 'Anantapur', 'Bapatla', 'Bheemunipatnam', 'Bhimavaram', 'Bobbili', 'Chilakaluripet', 'Chirala', 'Chittoor', 'Dharmavaram', 'East Godavari', 'Eluru', 'Gooty', 'Gudivada', 'Gudur', 'Guntakal', 'Guntur', 'Hindupur', 'Jaggaiahpet', 'Jammalamadugu', 'Kadapa', 'Kadiri', 'Kakinada', 'Kandukur', 'Kavali', 'Kovvur', 'Krishna', 'Kurnool', 'Macherla', 'Machilipatnam', 'Madanapalle', 'Mandapeta', 'Markapur', 'Nagari', 'Naidupet', 'Nandyal', 'Narasapuram', 'Narasaraopet', 'Narsipatnam', 'Nellore', 'Nidadavole', 'Nuzvid', 'Ongole', 'Palacole', 'Palasa Kasibugga', 'Parvathipuram', 'Pedana', 'Peddapuram', 'Pithapuram', 'Ponnur', 'Prakasam', 'Proddatur', 'Punganur', 'Puttur', 'Rajahmundry', 'Rajam', 'Rajampet', 'Ramachandrapuram', 'Rayachoti', 'Rayadurg', 'Renigunta', 'Repalle', 'Salur', 'Samalkot', 'Sattenapalle', 'Sri Potti Sriramulu Nellore', 'Srikakulam', 'Srikalahasti', 'Srisailam Project (Right Flank Colony) Township', 'Sullurpeta', 'Tadepalligudem', 'Tadpatri', 'Tanuku', 'Tenali', 'Tirupati', 'Tiruvuru', 'Tuni', 'Uravakonda', 'Venkatagiri', 'Vijayawada', 'Vinukonda', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'Y S R', 'Yemmiganur', 'Yerraguntla'],
  },
  {
    state: 'Arunachal Pradesh',
    districts: ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kurung Kumey', 'Lohit', 'Lower Dibang Valley', 'Lower Subansiri', 'Papum Pare', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
    cities: ['Anjaw', 'Changlang', 'Dibang Valley', 'East Kameng', 'East Siang', 'Kurung Kumey', 'Lohit', 'Lower Dibang Valley', 'Lower Subansiri', 'Naharlagun', 'Papum Pare', 'Pasighat', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
  },
  {
    state: 'Assam',
    districts: ['Baksa', 'Barpeta', 'Bongaigaon', 'Cachar', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Goalpara', 'Golaghat', 'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Morigaon', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia', 'Udalguri'],
    cities: ['Baksa', 'Barpeta', 'Bongaigaon', 'Bongaigaon City', 'Cachar', 'Chirang', 'Darrang', 'Dhemaji', 'Dhubri', 'Dibrugarh', 'Dima Hasao', 'Diphu', 'Dispur', 'Goalpara', 'Golaghat', 'Guwahati', 'Hailakandi', 'Jorhat', 'Kamrup', 'Kamrup Metropolitan', 'Karbi Anglong', 'Karimganj', 'Kokrajhar', 'Lakhimpur', 'Lanka', 'Lumding', 'Mangaldoi', 'Mankachar', 'Margherita', 'Mariani', 'Marigaon', 'Morigaon', 'Nagaon', 'Nalbari', 'North Lakhimpur', 'Rangia', 'Sibsagar', 'Silapathar', 'Silchar', 'Sivasagar', 'Sonitpur', 'Tezpur', 'Tinsukia', 'Udalguri'],
  },
  {
    state: 'Bihar',
    districts: ['Araria', 'Arwal', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Darbhanga', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Madhepura', 'Madhubani', 'Munger', 'Muzaffarpur', 'Nalanda', 'Nawada', 'Pashchim Champaran', 'Patna', 'Purba Champaran', 'Purnia', 'Rohtas', 'Saharsa', 'Samastipur', 'Saran', 'Sheikhpura', 'Sheohar', 'Sitamarhi', 'Siwan', 'Supaul', 'Vaishali'],
    cities: ['Araria', 'Arrah', 'Arwal', 'Asarganj', 'Aurangabad', 'Bagaha', 'Banka', 'Barh', 'Begusarai', 'Bettiah', 'BhabUrban Agglomeration', 'Bhagalpur', 'Bhojpur', 'Buxar', 'Chhapra', 'Darbhanga', 'Dehri-on-Sone', 'Dumraon', 'Forbesganj', 'Gaya', 'Gopalganj', 'Hajipur', 'Jamalpur', 'Jamui', 'Jehanabad', 'Kaimur', 'Katihar', 'Khagaria', 'Kishanganj', 'Lakhisarai', 'Lalganj', 'Madhepura', 'Madhubani', 'Maharajganj', 'Mahnar Bazar', 'Makhdumpur', 'Maner', 'Manihari', 'Marhaura', 'Masaurhi', 'Mirganj', 'Mokameh', 'Motihari', 'Motipur', 'Munger', 'Murliganj', 'Muzaffarpur', 'Nalanda', 'Narkatiaganj', 'Naugachhia', 'Nawada', 'Nokha', 'Pashchim Champaran', 'Patna', 'Piro', 'Purba Champaran', 'Purnia', 'Rafiganj', 'Rajgir', 'Ramnagar', 'Raxaul Bazar', 'Revelganj', 'Rohtas', 'Rosera', 'Saharsa', 'Samastipur', 'Saran', 'Sasaram', 'Sheikhpura', 'Sheohar', 'Sherghati', 'Silao', 'Sitamarhi', 'Siwan', 'Sonepur', 'Sugauli', 'Sultanganj', 'Supaul', 'Vaishali', 'Warisaliganj'],
  },
  {
    state: 'Chandigarh',
    districts: ['Chandigarh'],
    cities: ['Chandigarh'],
  },
  {
    state: 'Chhattisgarh',
    districts: ['Bastar', 'Bijapur', 'Bilaspur', 'Dakshin Bastar Dantewada', 'Dhamtari', 'Durg', 'Janjgir Champa', 'Jashpur', 'Kabeerdham', 'Korba', 'Koriya', 'Mahasamund', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Surguja', 'Uttar Bastar Kanker'],
    cities: ['Ambikapur', 'Bastar', 'Bhatapara', 'Bhilai Nagar', 'Bijapur', 'Bilaspur', 'Chirmiri', 'Dakshin Bastar Dantewada', 'Dalli-Rajhara', 'Dhamtari', 'Durg', 'Jagdalpur', 'Janjgir Champa', 'Jashpur', 'Kabeerdham', 'Korba', 'Koriya', 'Mahasamund', 'Manendragarh', 'Mungeli', 'Naila Janjgir', 'Narayanpur', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Sakti', 'Surguja', 'Tilda Newra', 'Uttar Bastar Kanker'],
  },
  {
    state: 'Dadra & Nagar Haveli',
    districts: ['Dadra & Nagar Haveli'],
    cities: ['Dadra & Nagar Haveli', 'Silvassa'],
  },
  {
    state: 'Daman & Diu',
    districts: ['Daman', 'Diu'],
    cities: ['Daman', 'Diu'],
  },
  {
    state: 'Delhi',
    districts: ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'South Delhi', 'South West Delhi', 'West Delhi'],
    cities: ['Central Delhi', 'Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'South Delhi', 'South West Delhi', 'West Delhi'],
  },
  {
    state: 'Goa',
    districts: ['North Goa', 'South Goa'],
    cities: ['Mapusa', 'Margao', 'Marmagao', 'North Goa', 'Panaji', 'South Goa'],
  },
  {
    state: 'Gujarat',
    districts: ['Ahmadabad', 'Amreli', 'Anand', 'Banas Kantha', 'Bharuch', 'Bhavnagar', 'Dohad', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Kachchh', 'Kheda', 'Mahesana', 'Narmada', 'Navsari', 'Panch Mahals', 'Patan', 'Porbandar', 'Rajkot', 'Sabar Kantha', 'Surat', 'Surendranagar', 'Tapi', 'The Dangs', 'Vadodara', 'Valsad'],
    cities: ['Adalaj', 'Ahmadabad', 'Ahmedabad', 'Amreli', 'Anand', 'Anjar', 'Ankleshwar', 'Banas Kantha', 'Bharuch', 'Bhavnagar', 'Bhuj', 'Chhapra', 'Deesa', 'Dhoraji', 'Dohad', 'Gandhinagar', 'Godhra', 'Jamnagar', 'Junagadh', 'Kachchh', 'Kadi', 'Kapadvanj', 'Keshod', 'Khambhat', 'Kheda', 'Lathi', 'Limbdi', 'Lunawada', 'Mahemdabad', 'Mahesana', 'Mahuva', 'Manavadar', 'Mandvi', 'Mangrol', 'Mansa', 'Modasa', 'Morvi', 'Nadiad', 'Narmada', 'Navsari', 'Padra', 'Palanpur', 'Palitana', 'Panch Mahals', 'Pardi', 'Patan', 'Petlad', 'Porbandar', 'Radhanpur', 'Rajkot', 'Rajpipla', 'Rajula', 'Ranavav', 'Rapar', 'Sabar Kantha', 'Salaya', 'Sanand', 'Savarkundla', 'Sidhpur', 'Sihor', 'Songadh', 'Surat', 'Surendranagar', 'Talaja', 'Tapi', 'Thangadh', 'Tharad', 'The Dangs', 'Umbergaon', 'Umreth', 'Una', 'Unjha', 'Upleta', 'Vadnagar', 'Vadodara', 'Valsad', 'Vapi', 'Veraval', 'Vijapur', 'Viramgam', 'Visnagar', 'Vyara', 'Wadhwan', 'Wankaner'],
  },
  {
    state: 'Haryana',
    districts: ['Ambala', 'Bhiwani', 'Faridabad', 'Fatehabad', 'Gurgaon', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Mewat', 'Palwal', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    cities: ['Ambala', 'Bahadurgarh', 'Bhiwani', 'Charkhi Dadri', 'Faridabad', 'Fatehabad', 'Gohana', 'Gurgaon', 'Hansi', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Ladwa', 'Mahendragarh', 'Mandi Dabwali', 'Mewat', 'Narnaul', 'Narwana', 'Palwal', 'Panchkula', 'Panipat', 'Pehowa', 'Pinjore', 'Rania', 'Ratia', 'Rewari', 'Rohtak', 'Safidon', 'Samalkha', 'Sarsod', 'Shahbad', 'Sirsa', 'Sohna', 'Sonipat', 'Taraori', 'Thanesar', 'Tohana', 'Yamunanagar'],
  },
  {
    state: 'Himachal Pradesh',
    districts: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahul & Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
    cities: ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahul & Spiti', 'Mandi', 'Nahan', 'Palampur', 'Shimla', 'Sirmaur', 'Solan', 'Sundarnagar', 'Una'],
  },
  {
    state: 'Jammu & Kashmir',
    districts: ['Anantnag', 'Badgam', 'Bandipore', 'Baramula', 'Doda', 'Ganderbal', 'Jammu', 'Kargil', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Leh', 'Pulwama', 'Punch', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shupiyan', 'Srinagar', 'Udhampur'],
    cities: ['Anantnag', 'Badgam', 'Bandipore', 'Baramula', 'Doda', 'Ganderbal', 'Jammu', 'Kargil', 'Kathua', 'KathUrban Agglomeration', 'Kishtwar', 'Kulgam', 'Kupwara', 'Leh', 'Pulwama', 'Punch', 'Rajauri', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shupiyan', 'Sopore', 'Srinagar', 'Udhampur'],
  },
  {
    state: 'Jharkhand',
    districts: ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamtara', 'Khunti', 'Kodarma', 'Latehar', 'Lohardaga', 'Pakur', 'Palamu', 'Pashchimi Singhbhum', 'Purbi Singhbhum', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Saraikela Kharsawan', 'Simdega'],
    cities: ['Adityapur', 'Bokaro', 'Bokaro Steel City', 'Chaibasa', 'Chatra', 'Chirkunda', 'Deoghar', 'Dhanbad', 'Dumka', 'Garhwa', 'Giridih', 'Godda', 'Gumia', 'Gumla', 'Hazaribag', 'Hazaribagh', 'Jamshedpur', 'Jamtara', 'Jhumri Tilaiya', 'Khunti', 'Kodarma', 'Latehar', 'Lohardaga', 'Madhupur', 'Medininagar (Daltonganj)', 'Mihijam', 'Musabani', 'Pakaur', 'Pakur', 'Palamu', 'Pashchimi Singhbhum', 'Patratu', 'Phusro', 'Purbi Singhbhum', 'Ramgarh', 'Ranchi', 'Sahibganj', 'Saraikela Kharsawan', 'Saunda', 'Simdega', 'Tenu dam-cum-Kathhara'],
  },
  {
    state: 'Karnataka',
    districts: ['Bagalkot', 'Bangalore', 'Bangalore Rural', 'Belgaum', 'Bellary', 'Bidar', 'Bijapur', 'Chamarajanagar', 'Chikkaballapura', 'Chikmagalur', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Gulbarga', 'Hassan', 'Haveri', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysore', 'Raichur', 'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Uttara Kannada', 'Yadgir'],
    cities: ['Adyar', 'Afzalpur', 'Arsikere', 'Athni', 'Bagalkot', 'Ballari', 'Bangalore', 'Bangalore Rural', 'Belagavi', 'Belgaum', 'Bellary', 'Bengaluru', 'Bidar', 'Bijapur', 'Chamarajanagar', 'Chikkaballapura', 'Chikkamagaluru', 'Chikmagalur', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Gokak', 'Gulbarga', 'Hassan', 'Haveri', 'Hubli-Dharwad', 'Karwar', 'Kodagu', 'Kolar', 'Koppal', 'Lakshmeshwar', 'Lingsugur', 'Maddur', 'Madhugiri', 'Madikeri', 'Magadi', 'Mahalingapura', 'Malavalli', 'Malur', 'Mandya', 'Mangaluru', 'Manvi', 'Mudabidri', 'Mudalagi', 'Muddebihal', 'Mudhol', 'Mulbagal', 'Mundargi', 'Mysore', 'Nanjangud', 'Nargund', 'Navalgund', 'Nelamangala', 'Pavagada', 'Piriyapatna', 'Puttur', 'Raayachuru', 'Rabkavi Banhatti', 'Raichur', 'Ramanagara', 'Ramanagaram', 'Ramdurg', 'Ranebennuru', 'Ranibennur', 'Robertson Pet', 'Ron', 'Sadalagi', 'Sagara', 'Sakaleshapura', 'Sanduru', 'Sankeshwara', 'Saundatti-Yellamma', 'Savanur', 'Sedam', 'Shahabad', 'Shahpur', 'Shiggaon', 'Shikaripur', 'Shimoga', 'Shivamogga', 'Shrirangapattana', 'Sidlaghatta', 'Sindagi', 'Sindhagi', 'Sindhnur', 'Sira', 'Sirsi', 'Siruguppa', 'Srinivaspur', 'Surapura', 'Talikota', 'Tarikere', 'Tekkalakote', 'Terdal', 'Tiptur', 'Tumkur', 'Udupi', 'Uttara Kannada', 'Vijayapura', 'Wadi', 'Yadgir'],
  },
  {
    state: 'Kerala',
    districts: ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
    cities: ['Adoor', 'Alappuzha', 'Attingal', 'Chalakudy', 'Changanassery', 'Cherthala', 'Chittur-Thathamangalam', 'Ernakulam', 'Guruvayoor', 'Idukki', 'Kanhangad', 'Kannur', 'Kasaragod', 'Kayamkulam', 'Kochi', 'Kodungallur', 'Kollam', 'Kottayam', 'Koyilandy', 'Kozhikode', 'Kunnamkulam', 'Malappuram', 'Mattannur', 'Mavelikkara', 'Mavoor', 'Muvattupuzha', 'Nedumangad', 'Neyyattinkara', 'Nilambur', 'Ottappalam', 'Palai', 'Palakkad', 'Panamattom', 'Panniyannur', 'Pappinisseri', 'Paravoor', 'Pathanamthitta', 'Peringathur', 'Perinthalmanna', 'Perumbavoor', 'Ponnani', 'Punalur', 'Puthuppally', 'Shoranur', 'Taliparamba', 'Thiruvalla', 'Thiruvananthapuram', 'Thodupuzha', 'Thrissur', 'Tirur', 'Vaikom', 'Varkala', 'Vatakara', 'Wayanad'],
  },
  {
    state: 'Lakshadweep',
    districts: ['Lakshadweep'],
    cities: ['Lakshadweep'],
  },
  {
    state: 'Madhya Pradesh',
    districts: ['Alirajpur', 'Anuppur', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Mandla', 'Mandsaur', 'Morena', 'Narsimhapur', 'Neemuch', 'Panna', 'Raisen', 'Rajgarh', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shahdol', 'Shajapur', 'Sheopur', 'Shivpuri', 'Sidhi', 'Singrauli', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha'],
    cities: ['Alirajpur', 'Anuppur', 'Ashok Nagar', 'Ashoknagar', 'Balaghat', 'Barwani', 'Betul', 'Bhind', 'Bhopal', 'Burhanpur', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Datia', 'Dewas', 'Dhar', 'Dindori', 'Ganjbasoda', 'Guna', 'Gwalior', 'Harda', 'Hoshangabad', 'Indore', 'Itarsi', 'Jabalpur', 'Jhabua', 'Katni', 'Khandwa', 'Khargone', 'Lahar', 'Maharajpur', 'Mahidpur', 'Maihar', 'Malaj Khand', 'Manasa', 'Manawar', 'Mandideep', 'Mandla', 'Mandsaur', 'Mauganj', 'Mhow Cantonment', 'Mhowgaon', 'Morena', 'Multai', 'Mundi', 'Murwara (Katni)', 'Nagda', 'Nainpur', 'Narsimhapur', 'Narsinghgarh', 'Neemuch', 'Nepanagar', 'Niwari', 'Nowgong', 'Nowrozabad (Khodargama)', 'Pachore', 'Pali', 'Panagar', 'Pandhurna', 'Panna', 'Pasan', 'Pipariya', 'Pithampur', 'Porsa', 'Prithvipur', 'Raghogarh-Vijaypur', 'Rahatgarh', 'Raisen', 'Rajgarh', 'Ratlam', 'Rau', 'Rehli', 'Rewa', 'Sabalgarh', 'Sagar', 'Sanawad', 'Sarangpur', 'Sarni', 'Satna', 'Sausar', 'Sehore', 'Sendhwa', 'Seoni', 'Seoni-Malwa', 'Shahdol', 'Shajapur', 'Shamgarh', 'Sheopur', 'Shivpuri', 'Shujalpur', 'Sidhi', 'Sihora', 'Singrauli', 'Sironj', 'Sohagpur', 'Tarana', 'Tikamgarh', 'Ujjain', 'Umaria', 'Vidisha', 'Vijaypur', 'Wara Seoni'],
  },
  {
    state: 'Maharashtra',
    districts: ['Ahmadnagar', 'Akola', 'Amravati', 'Aurangabad', 'Bhandara', 'Bid', 'Buldana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondiya', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Parbhani', 'Pune', 'Raigarh', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    cities: ['Achalpur', 'Ahmadnagar', 'Ahmednagar', 'Akola', 'Akot', 'Amalner', 'Ambejogai', 'Amravati', 'Anjangaon', 'Arvi', 'Aurangabad', 'Bhandara', 'Bhiwandi', 'Bid', 'Buldana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondiya', 'Hingoli', 'Ichalkaranji', 'Jalgaon', 'Jalna', 'Kalyan-Dombivali', 'Karjat', 'Kolhapur', 'Latur', 'Loha', 'Lonar', 'Lonavla', 'Mahad', 'Malegaon', 'Malkapur', 'Mangalvedhe', 'Mangrulpir', 'Manjlegaon', 'Manmad', 'Manwath', 'Mehkar', 'Mhaswad', 'Mira-Bhayandar', 'Morshi', 'Mukhed', 'Mul', 'Mumbai', 'Murtijapur', 'Nagpur', 'Nanded', 'Nanded-Waghala', 'Nandgaon', 'Nandura', 'Nandurbar', 'Narkhed', 'Nashik', 'Nawapur', 'Nilanga', 'Osmanabad', 'Ozar', 'Pachora', 'Paithan', 'Palghar', 'Pandharkaoda', 'Pandharpur', 'Panvel', 'Parbhani', 'Parli', 'Partur', 'Pathardi', 'Pathri', 'Patur', 'Pauni', 'Pen', 'Phaltan', 'Pulgaon', 'Pune', 'Purna', 'Pusad', 'Rahuri', 'Raigarh', 'Rajura', 'Ramtek', 'Ratnagiri', 'Raver', 'Risod', 'Sailu', 'Sangamner', 'Sangli', 'Sangole', 'Sasvad', 'Satana', 'Satara', 'Savner', 'Sawantwadi', 'Shahade', 'Shegaon', 'Shendurjana', 'Shirdi', 'Shirpur-Warwade', 'Shirur', 'Shrigonda', 'Shrirampur', 'Sillod', 'Sindhudurg', 'Sinnar', 'Solapur', 'Soyagaon', 'Talegaon Dabhade', 'Talode', 'Tasgaon', 'Thane', 'Tirora', 'Tuljapur', 'Tumsar', 'Uchgaon', 'Udgir', 'Umarga', 'Umarkhed', 'Umred', 'Uran', 'Uran Islampur', 'Vadgaon Kasba', 'Vaijapur', 'Vasai-Virar', 'Vita', 'Wadgaon Road', 'Wai', 'Wani', 'Wardha', 'Warora', 'Warud', 'Washim', 'Yavatmal', 'Yawal', 'Yevla'],
  },
  {
    state: 'Manipur',
    districts: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul'],
    cities: ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal', 'Imphal East', 'Imphal West', 'Lilong', 'Mayang Imphal', 'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul'],
  },
  {
    state: 'Meghalaya',
    districts: ['East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Ribhoi', 'South Garo Hills', 'West Garo Hills', 'West Khasi Hills'],
    cities: ['East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Nongstoin', 'Ribhoi', 'Shillong', 'South Garo Hills', 'Tura', 'West Garo Hills', 'West Khasi Hills'],
  },
  {
    state: 'Mizoram',
    districts: ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
    cities: ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
  },
  {
    state: 'Nagaland',
    districts: ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
    cities: ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
  },
  {
    state: 'Odisha',
    districts: ['Anugul', 'Balangir', 'Baleshwar', 'Bargarh', 'Baudh', 'Bhadrak', 'Cuttack', 'Debagarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghapur', 'Jajapur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangapur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
    cities: ['Anugul', 'Balangir', 'Baleshwar', 'Baleshwar Town', 'Barbil', 'Bargarh', 'Baripada Town', 'Baudh', 'Bhadrak', 'Bhawanipatna', 'Bhubaneswar', 'Brahmapur', 'Byasanagar', 'Cuttack', 'Debagarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghapur', 'Jajapur', 'Jatani', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangapur', 'Nayagarh', 'Nuapada', 'Paradip', 'Parlakhemundi', 'Pattamundai', 'Phulabani', 'Puri', 'Rairangpur', 'Rajagangapur', 'Raurkela', 'Rayagada', 'Sambalpur', 'Soro', 'Subarnapur', 'Sunabeda', 'Sundargarh', 'Talcher', 'Tarbha', 'Titlagarh'],
  },
  {
    state: 'Puducherry',
    districts: ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
    cities: ['Karaikal', 'Mahe', 'Pondicherry', 'Puducherry', 'Yanam'],
  },
  {
    state: 'Punjab',
    districts: ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Firozpur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Muktsar', 'Patiala', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Tarn Taran'],
    cities: ['Amritsar', 'Barnala', 'Batala', 'Bathinda', 'Dhuri', 'Faridkot', 'Fatehgarh Sahib', 'Fazilka', 'Firozpur', 'Firozpur Cantt.', 'Gobindgarh', 'Gurdaspur', 'Hoshiarpur', 'Jagraon', 'Jalandhar', 'Jalandhar Cantt.', 'Kapurthala', 'Khanna', 'Kharar', 'Kot Kapura', 'Longowal', 'Ludhiana', 'Malerkotla', 'Malout', 'Mansa', 'Moga', 'Mohali', 'Morinda, India', 'Mukerian', 'Muktsar', 'Nabha', 'Nakodar', 'Nangal', 'Nawanshahr', 'Pathankot', 'Patiala', 'Patti', 'Pattran', 'Phagwara', 'Phillaur', 'Qadian', 'Raikot', 'Rajpura', 'Rampura Phul', 'Rupnagar', 'Sahibzada Ajit Singh Nagar', 'Samana', 'Sangrur', 'Shahid Bhagat Singh Nagar', 'Sirhind Fatehgarh Sahib', 'Sujanpur', 'Sunam', 'Talwara', 'Tarn Taran', 'Urmar Tanda', 'Zira', 'Zirakpur'],
  },
  {
    state: 'Rajasthan',
    districts: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittaurgarh', 'Churu', 'Dausa', 'Dhaulpur', 'Dungarpur', 'Jaipur', 'Jaisalmer', 'Jalor', 'Jhalawar', 'Jhunjhunun', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
    cities: ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittaurgarh', 'Churu', 'Dausa', 'Dhaulpur', 'Dungarpur', 'Jaipur', 'Jaisalmer', 'Jalor', 'Jhalawar', 'Jhunjhunun', 'Jodhpur', 'Karauli', 'Kota', 'Lachhmangarh', 'Ladnu', 'Lakheri', 'Lalsot', 'Losal', 'Makrana', 'Malpura', 'Mandalgarh', 'Mandawa', 'Mangrol', 'Merta City', 'Mount Abu', 'Nadbai', 'Nagar', 'Nagaur', 'Nasirabad', 'Nathdwara', 'Neem-Ka-Thana', 'Nimbahera', 'Nohar', 'Nokha', 'Pali', 'Phalodi', 'Phulera', 'Pilani', 'Pilibanga', 'Pindwara', 'Pipar City', 'Prantij', 'Pratapgarh', 'Raisinghnagar', 'Rajakhera', 'Rajaldesar', 'Rajgarh (Alwar)', 'Rajgarh (Churu)', 'Rajsamand', 'Ramganj Mandi', 'Ramngarh', 'Ratangarh', 'Rawatbhata', 'Rawatsar', 'Reengus', 'Sadri', 'Sadulpur', 'Sadulshahar', 'Sagwara', 'Sambhar', 'Sanchore', 'Sangaria', 'Sardarshahar', 'Sawai Madhopur', 'Shahpura', 'Sheoganj', 'Sikar', 'Sirohi', 'Sojat', 'Sri Madhopur', 'Sujangarh', 'Sumerpur', 'Suratgarh', 'Takhatgarh', 'Taranagar', 'Todabhim', 'Todaraisingh', 'Tonk', 'Udaipur', 'Udaipurwati', 'Vijainagar, Ajmer'],
  },
  {
    state: 'Sikkim',
    districts: ['East District', 'North District', 'South District', 'West District'],
    cities: ['East District', 'North District', 'South District', 'West District'],
  },
  {
    state: 'Tamil Nadu',
    districts: ['Ariyalur', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Salem', 'Sivaganga', 'Thanjavur', 'The Nilgiris', 'Theni', 'Thiruvallur', 'Thiruvarur', 'Thoothukkudi', 'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Tiruvannamalai', 'Vellore', 'Viluppuram', 'Virudhunagar'],
    cities: ['Arakkonam', 'Ariyalur', 'Aruppukkottai', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Gobichettipalayam', 'Kancheepuram', 'Kanniyakumari', 'Karur', 'Krishnagiri', 'Lalgudi', 'Madurai', 'Manachanallur', 'Nagapattinam', 'Nagercoil', 'Namagiripettai', 'Namakkal', 'Nandivaram-Guduvancheri', 'Nanjikottai', 'Natham', 'Nellikuppam', 'Neyveli (TS)', 'O\' Valley', 'Oddanchatram', 'P.N.Patti', 'Pacode', 'Padmanabhapuram', 'Palani', 'Palladam', 'Pallapatti', 'Pallikonda', 'Panagudi', 'Panruti', 'Paramakudi', 'Parangipettai', 'Pattukkottai', 'Perambalur', 'Peravurani', 'Periyakulam', 'Periyasemur', 'Pernampattu', 'Pollachi', 'Polur', 'Ponneri', 'Pudukkottai', 'Pudupattinam', 'Puliyankudi', 'Punjaipugalur', 'Rajapalayam', 'Ramanathapuram', 'Rameshwaram', 'Ranipet', 'Rasipuram', 'Salem', 'Sankarankovil', 'Sankari', 'Sathyamangalam', 'Sattur', 'Shenkottai', 'Sholavandan', 'Sholingur', 'Sirkali', 'Sivaganga', 'Sivagiri', 'Sivakasi', 'Srivilliputhur', 'Surandai', 'Suriyampalayam', 'Tenkasi', 'Thammampatti', 'Thanjavur', 'Tharamangalam', 'Tharangambadi', 'The Nilgiris', 'Theni', 'Theni Allinagaram', 'Thirumangalam', 'Thirupuvanam', 'Thiruthuraipoondi', 'Thiruvallur', 'Thiruvarur', 'Thoothukkudi', 'Thuraiyur', 'Tindivanam', 'Tiruchendur', 'Tiruchengode', 'Tiruchirappalli', 'Tirukalukundram', 'Tirukkoyilur', 'Tirunelveli', 'Tirupathur', 'Tiruppur', 'Tiruttani', 'Tiruvannamalai', 'Tiruvethipuram', 'Tittakudi', 'Udhagamandalam', 'Udumalaipettai', 'Unnamalaikadai', 'Usilampatti', 'Uthamapalayam', 'Uthiramerur', 'Vadakkuvalliyur', 'Vadalur', 'Vadipatti', 'Valparai', 'Vandavasi', 'Vaniyambadi', 'Vedaranyam', 'Vellakoil', 'Vellore', 'Vikramasingapuram', 'Viluppuram', 'Virudhachalam', 'Virudhunagar', 'Viswanatham'],
  },
  {
    state: 'Telangana',
    districts: ['Adilabad', 'Hyderabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Medak', 'Nalgonda', 'Nizamabad', 'Rangareddy', 'Warangal'],
    cities: ['Adilabad', 'Bellampalle', 'Bhadrachalam', 'Bhainsa', 'Bhongir', 'Bodhan', 'Farooqnagar', 'Gadwal', 'Hyderabad', 'Jagtial', 'Jangaon', 'Kagaznagar', 'Kamareddy', 'Karimnagar', 'Khammam', 'Koratla', 'Kothagudem', 'Kyathampalle', 'Mahbubnagar', 'Mancherial', 'Mandamarri', 'Manuguru', 'Medak', 'Miryalaguda', 'Nagarkurnool', 'Nalgonda', 'Narayanpet', 'Nirmal', 'Nizamabad', 'Palwancha', 'Ramagundam', 'Rangareddy', 'Sadasivpet', 'Sangareddy', 'Siddipet', 'Sircilla', 'Suryapet', 'Tandur', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yellandu'],
  },
  {
    state: 'Tripura',
    districts: ['Dhalai', 'North Tripura', 'South Tripura', 'West Tripura'],
    cities: ['Agartala', 'Belonia', 'Dhalai', 'Dharmanagar', 'Kailasahar', 'Khowai', 'North Tripura', 'Pratapgarh', 'South Tripura', 'Udaipur', 'West Tripura'],
  },
  {
    state: 'Uttar Pradesh',
    districts: ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Bara Banki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hardoi', 'Jalaun', 'Jaunpur', 'Jhansi', 'Jyotiba Phule Nagar', 'Kannauj', 'Kanpur Dehat', 'Kanpur Nagar', 'Kanshiram Nagar', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Mahamaya Nagar', 'Mahoba', 'Mahrajganj', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Pilibhit', 'Pratapgarh', 'Rae Bareli', 'Rampur', 'Saharanpur', 'Sant Kabir Nagar', 'Sant Ravidas Nagar', 'Shahjahanpur', 'Shrawasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    cities: ['Achhnera', 'Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Amroha', 'Auraiya', 'Azamgarh', 'Baghpat', 'Bahraich', 'Ballia', 'Balrampur', 'Banda', 'Bara Banki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Chandausi', 'Chitrakoot', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Fatehpur Sikri', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Jalaun', 'Jaunpur', 'Jhansi', 'Jyotiba Phule Nagar', 'Kalpi', 'Kannauj', 'Kanpur', 'Kanpur Dehat', 'Kanpur Nagar', 'Kanshiram Nagar', 'Kaushambi', 'Khair', 'Kheri', 'Kushinagar', 'Laharpur', 'Lakhimpur', 'Lal Gopalganj Nindaura', 'Lalganj', 'Lalitpur', 'Lar', 'Loni', 'Lucknow', 'Mahamaya Nagar', 'Mahoba', 'Mahrajganj', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Modinagar', 'Moradabad', 'Muzaffarnagar', 'Nagina', 'Najibabad', 'Nakur', 'Nanpara', 'Naraura', 'Naugawan Sadat', 'Nautanwa', 'Nawabganj', 'Nehtaur', 'Niwai', 'Noida', 'Noorpur', 'Obra', 'Orai', 'Padrauna', 'Palia Kalan', 'Parasi', 'Phulpur', 'Pihani', 'Pilibhit', 'Pilkhuwa', 'Powayan', 'Pratapgarh', 'Pukhrayan', 'Puranpur', 'PurqUrban Agglomerationzi', 'Purwa', 'Rae Bareli', 'Rampur', 'Rampur Maniharan', 'Rasra', 'Rath', 'Renukoot', 'Reoti', 'Robertsganj', 'Rudauli', 'Rudrapur', 'Sadabad', 'Safipur', 'Saharanpur', 'Sahaspur', 'Sahaswan', 'Sahawar', 'Sahjanwa', 'Saidpur', 'Sambhal', 'Samdhan', 'Samthar', 'Sandi', 'Sandila', 'Sant Kabir Nagar', 'Sant Ravidas Nagar', 'Sardhana', 'Seohara', 'Shahabad, Hardoi', 'Shahabad, Rampur', 'Shahganj', 'Shahjahanpur', 'Shamli', 'Shamsabad, Agra', 'Shamsabad, Farrukhabad', 'Sherkot', 'Shikarpur, Bulandshahr', 'Shikohabad', 'Shishgarh', 'Shrawasti', 'Siana', 'Siddharthnagar', 'Sikanderpur', 'Sikandra Rao', 'Sikandrabad', 'Sirsaganj', 'Sirsi', 'Sitapur', 'Sonbhadra', 'Soron', 'Sultanpur', 'Sumerpur', 'SUrban Agglomerationr', 'Tanda', 'Thakurdwara', 'Thana Bhawan', 'Tilhar', 'Tirwaganj', 'Tulsipur', 'Tundla', 'Ujhani', 'Unnao', 'Utraula', 'Varanasi', 'Vrindavan', 'Warhapur', 'Zaidpur', 'Zamania'],
  },
  {
    state: 'Uttarakhand',
    districts: ['Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Garhwal', 'Hardwar', 'Nainital', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
    cities: ['Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Garhwal', 'Haldwani-cum-Kathgodam', 'Hardwar', 'Kashipur', 'Manglaur', 'Mussoorie', 'Nagla', 'Nainital', 'Pauri', 'Pithoragarh', 'Ramnagar', 'Rishikesh', 'Roorkee', 'Rudraprayag', 'Rudrapur', 'Sitarganj', 'Srinagar', 'Tehri', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
  },
  {
    state: 'West Bengal',
    districts: ['Bankura', 'Barddhaman', 'Birbhum', 'Dakshin Dinajpur', 'Darjiling', 'Haora', 'Hugli', 'Jalpaiguri', 'Koch Bihar', 'Maldah', 'Murshidabad', 'Nadia', 'North Twenty Four Parganas', 'Paschim Medinipur', 'Purba Medinipur', 'Puruliya', 'South Twenty Four Parganas', 'Uttar Dinajpur'],
    cities: ['Adra', 'AlipurdUrban Agglomerationr', 'Arambagh', 'Asansol', 'Baharampur', 'Balurghat', 'Bankura', 'Barddhaman', 'Birbhum', 'Dakshin Dinajpur', 'Darjiling', 'English Bazar', 'Gangarampur', 'Habra', 'Haora', 'Hugli', 'Hugli-Chinsurah', 'Jalpaiguri', 'Jhargram', 'Kalimpong', 'Kharagpur', 'Koch Bihar', 'Kolkata', 'Mainaguri', 'Malda', 'Maldah', 'Mathabhanga', 'Medinipur', 'Memari', 'Monoharpur', 'Murshidabad', 'Nabadwip', 'Nadia', 'Naihati', 'North Twenty Four Parganas', 'Panchla', 'PandUrban Agglomeration', 'Paschim Medinipur', 'Paschim Punropara', 'Purba Medinipur', 'Purulia', 'Puruliya', 'Raghunathganj', 'Raghunathpur', 'Raiganj', 'Rampurhat', 'Ranaghat', 'Sainthia', 'Santipur', 'Siliguri', 'Sonamukhi', 'South Twenty Four Parganas', 'Srirampore', 'Suri', 'Taki', 'Tamluk', 'Tarakeswar', 'Uttar Dinajpur'],
  },
];

export const ALL_DISTRICTS: string[] = Array.from(new Set(STATES_LOCATIONS.flatMap((s) => s.districts))).sort((a, b) => a.localeCompare(b));
export const ALL_CITIES: string[] = Array.from(new Set(STATES_LOCATIONS.flatMap((s) => s.cities))).sort((a, b) => a.localeCompare(b));
