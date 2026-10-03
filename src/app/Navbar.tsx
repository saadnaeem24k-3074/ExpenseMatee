
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { useGSAP } from "@gsap/react"
import gsap from 'gsap'
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/useAuth"
import { LogOut, Settings } from "lucide-react"

const Navbar = () => {

    const [show, setShow] = useState(false);
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    const tl = gsap.timeline();
    const tl2 = gsap.timeline();
    useGSAP(() => {
        if (!show) {

            tl.from('.navv', {
                y: -20,
            })

            tl.from('.head', {
                y: -30,
                opacity: 0,
                stagger: 0.2
            })

            tl.from('.one , .two , .three , .four', {
                y: -30,
                opacity: 0,
                stagger: 0.2,
            })
        }

        if (show) {
            tl2.from(".hamburger", {
                x: 200,
                opacity: 0,
            })

            tl2.from('.one , .two , .three , .four , .five , .cross', {
                x: 30,
                opacity: 0,
                stagger: 0.2,
            })
        }
    }, [show])

    return (

        <div>
<div className="bg-navy flex items-center justify-between max-w-[100%] navv py-3 px-5 relative z-50">
                <h1 className=" text-xl sm:text-2xl md:text-3xl my-display text-white font-semibold head">ExpenseMate</h1>
                <NavigationMenu className="">

                    {!show && <NavigationMenuList className="flex gap-5">

                        <div className="one">
                            <NavigationMenuItem>
                                <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            hidden sm:block">
                                    <Link to="/">Dashboard</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </div>
                        <div className="two">
                            <NavigationMenuItem>
                                <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            hidden sm:block">
                                    <Link to="/transactions">Transactions</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </div>

                        <div className="three">
                            <NavigationMenuItem>
                                <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            hidden sm:block">
                                    <Link to='/report'>Report</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </div>

                        <div className="four">
                            <NavigationMenuItem>
                                <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            hidden sm:block">
                                    <Link to='/budget'>Budget</Link>
                                </NavigationMenuLink>
                            </NavigationMenuItem>
                        </div>

                        {user && (
                            <div className="hidden sm:flex items-center gap-3 pl-2">
                                <span className="my-poppins text-sm font-medium text-white/80">
                                    Hi, {user.name.split(' ')[0]}
                                </span>
                                <Link
                                    to="/settings"
                                    className="flex items-center gap-1 rounded bg-white/10 px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-white/20 cursor-pointer"
                                    aria-label="Settings"
                                >
                                    <Settings className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1 rounded bg-white/10 px-3 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-white/20 cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        )}


                    </NavigationMenuList>}

                    {show && <NavigationMenuList className="flex gap-5 relative hamburger">
                        <div className="z-2 flex flex-col gap-3 absolute top-[-35px] right-[-55px] bg-navyHover/80 py-20 px-10 rounded-2xl backdrop-blur-xs">
                            <p className="cross text-2xl text-white font-bold absolute top-5 right-5 rounded-full p-2 cursor-pointer hover:bg-navy"
                                onClick={() => tl2.reverse()}>×</p>
                            <div className="one">
                                <NavigationMenuItem>
                                    <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            ">
                                        <Link to="/">Dashboard</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </div>
                            <div className="two">
                                <NavigationMenuItem>
                                    <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            ">
                                        <Link to="/transactions">Transactions</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </div>

                            <div className="three">
                                <NavigationMenuItem>
                                    <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            ">
                                        <Link to='/report'>Report</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </div>

                            <div className="four">
                                <NavigationMenuItem>
                                    <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            ">
                                        <Link to='/budget'>Budget</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </div>

                            <div className="five">
                                <NavigationMenuItem>
                                    <NavigationMenuLink className="my-poppins font-medium bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 text-white rounded-lg text-[14px] md:text-[15px] lg:text-[16px]
                            ">
                                        <Link to='/settings'>Settings</Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </div>

                            {user && (
                                <button
                                    onClick={handleLogout}
                                    className="my-poppins flex items-center justify-center gap-2 rounded bg-white/10 px-4 py-2 text-[14px] font-semibold text-white cursor-pointer"
                                >
                                    <LogOut className="h-4 w-4" /> Log out
                                </button>
                            )}

                        </div>
                    </NavigationMenuList>}

                        <div className="">
                        <p className={`block sm:hidden text-xl text-white font-semibold cursor-pointer hover:bg-navyHover rounded-full p-2`}
                        onClick={()=> {
                            setShow(!show)
                        }
                            } >☰</p>
                    </div>
                </NavigationMenu>
            </div>


        </div>
    )
}

export default Navbar